import type { CharacteristicValue, Logging, PlatformAccessory, Service } from 'homebridge';

import type { SmartOccupancyHomebridgePlatform } from '../platform.js';
import { OccupancySensorConfig } from '../types/config.js';
import { SwitchAccessory } from './SwitchAccessory.js';
import { StorageLayer } from '../utils/StorageLayer.js';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */

interface OccupancySensorState {
  occupied: boolean;
}

export class OccupancySensorAccessory {
  private occupancySensorService: Service;

  private occupancySensorState: OccupancySensorState = {
    occupied: false,
  };

  private storage: StorageLayer;

  private switches: Map<string, SwitchAccessory> = new Map();

  private log: Logging;

  constructor(
    private readonly platform: SmartOccupancyHomebridgePlatform,
    private readonly occupancySensorConfig: OccupancySensorConfig,
    public readonly occupancySensorAccessory: PlatformAccessory,
    private readonly persistPath: string,
  ) {
    this.storage = new StorageLayer(this.persistPath);
    this.log = platform.log;

    this.occupancySensorAccessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'SmartOccupancy')
      .setCharacteristic(this.platform.Characteristic.Model, 'Occupancy Sensor')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'smart-occupancy-sensor');

    this.occupancySensorService = this.occupancySensorAccessory.getService(this.platform.Service.OccupancySensor)
      ?? this.occupancySensorAccessory.addService(this.platform.Service.OccupancySensor);

    this.occupancySensorService.setCharacteristic(this.platform.Characteristic.Name, occupancySensorAccessory.displayName);

    this.occupancySensorService.getCharacteristic(this.platform.Characteristic.OccupancyDetected)
      .onSet(this.setOccupancy.bind(this))
      .onGet(this.getOccupancy.bind(this));

    for (const switchConfig of (this.occupancySensorConfig.switches ?? [])) {
      const switchAccessory = new SwitchAccessory(
        this.platform,
        this,
        switchConfig,
        this.occupancySensorConfig,
        this.persistPath,
        this.platform.log,
      );
      this.switches.set(switchConfig.name, switchAccessory);
    }

    this.initStatus().catch((error) => {
      this.log.error(`Failed to initialize occupancy sensor status for ${occupancySensorConfig.name}:`, error);
    });

  }

  private async initStatus() {
    await this.storage.init();
    if (this.occupancySensorConfig.persistStatusAcrossReboots) {
      const persistedState = await this.storage.getItem<OccupancySensorState>(this.occupancySensorAccessory.UUID);
      if (!persistedState) {
        this.log.warn(`No persisted state found for switch ${this.occupancySensorConfig.name}, initializing to OFF`);
        this.setOccupancyStatus(false);
        return;
      }
      this.log.info(`Occupancy sensor ${this.occupancySensorConfig.name} restored state: ${this.occupancySensorState.occupied}`);
      this.setOccupancyStatus(persistedState.occupied);
      return;
    }
    if (this.occupancySensorConfig.alwaysBootAsOccupied) {
      this.log.info(`Occupancy sensor ${this.occupancySensorConfig.name} initialized as ON`);
      this.setOccupancyStatus(true);
      return;
    }
  }

  async setOccupancy(value: CharacteristicValue) {
    this.log.debug('Triggered SET Occupancy:', value);
    this.setOccupancyStatus(value);
  }

  async getOccupancy(): Promise<CharacteristicValue> {
    this.log.debug('Triggered GET Occupancy');
    return this.getOccupancyStatus();
  }

  private getOccupancyStatus(): number {
    return Number(this.occupancySensorState.occupied);
  }

  private setOccupancyStatus(value: CharacteristicValue) {
    this.log.debug('Setting occupancy status to:', value);
    this.occupancySensorState.occupied = Boolean(value);
    if (this.occupancySensorConfig.persistStatusAcrossReboots) {
      this.storage.setItem(this.occupancySensorAccessory.UUID, this.occupancySensorState).catch((error) => {
        this.log.error(`Failed to persist occupancy sensor state for ${this.occupancySensorConfig.name}:`, error);
      });
    }
    this.occupancySensorService.updateCharacteristic(this.platform.Characteristic.OccupancyDetected, this.getOccupancyStatus());
  }
}
