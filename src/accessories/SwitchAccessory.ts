import type { CharacteristicValue, Logging, Service } from 'homebridge';

import type { SmartOccupancyHomebridgePlatform } from '../platform.js';
import { OccupancySensorConfig, SwitchConfig } from '../types/config.js';
import { OccupancySensorAccessory } from './OccupancySensorAccessory.js';
import { StorageLayer } from '../utils/StorageLayer.js';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */

interface SwitchState {
  on: boolean;
}

export class SwitchAccessory {

  private switchService: Service;

  private storage: StorageLayer;

  private switchState: SwitchState = {
    on: false,
  };

  private switchUniqueName: string;

  constructor(
    private readonly platform: SmartOccupancyHomebridgePlatform,
    private readonly occupancySensorAccessory: OccupancySensorAccessory,
    private readonly switchConfig: SwitchConfig,
    private readonly sensorConfig: OccupancySensorConfig,
    private readonly persistPath: string,
    private readonly log: Logging,
  ) {

    this.storage = new StorageLayer(this.persistPath);

    this.switchUniqueName = `${switchConfig.name}-${switchConfig.type}`;

    this.switchService = this.occupancySensorAccessory.occupancySensorAccessory.getService(this.switchUniqueName)
      ?? this.occupancySensorAccessory.occupancySensorAccessory.addService(this.platform.Service.Switch, switchConfig.name, this.switchUniqueName);

    this.switchService.setCharacteristic(this.platform.Characteristic.ConfiguredName, switchConfig.name);

    this.switchService.getCharacteristic(this.platform.Characteristic.On)
      .onGet(this.handleOnGet.bind(this))
      .onSet(this.handleOnSet.bind(this));

    this.initStatus().catch((error) => {
      this.log.error(`Failed to initialize switch status for ${switchConfig.name}:`, error);
    });

  }

  private async initStatus() {
    await this.storage.init();
    if (this.sensorConfig.persistStatusAcrossReboots) {
      const persistedState = await this.storage.getItem<SwitchState>(this.switchUniqueName);
      if (!persistedState) {
        this.log.warn(`No persisted state found for switch ${this.switchConfig.name}, initializing to OFF`);
        this.setStatus(false);
        return;
      }
      this.log.info(`Switch ${this.switchConfig.name} initialized with persisted state:`, persistedState);
      this.setStatus(persistedState.on);
      return;
    }
    if (this.sensorConfig.alwaysBootAsOccupied) {
      this.log.info(`Switch ${this.switchConfig.name} initialized as ON`);
      this.setStatus(true);
      return;
    }
  }

  handleOnGet(): CharacteristicValue {
    this.log.debug('Triggered GET On');
    return this.getStatus();
  }

  handleOnSet(value: CharacteristicValue) {
    this.log.debug('Triggered SET On:', value);
    this.setStatus(value);
  }

  private getStatus(): number {
    return Number(this.switchState.on);
  }

  private setStatus(value: CharacteristicValue) {
    this.log.debug('Setting switch status to:', value);
    this.switchState.on = Boolean(value);
    if (this.sensorConfig.persistStatusAcrossReboots) {
      this.storage.setItem(this.switchUniqueName, this.switchState).catch((error) => {
        this.log.error(`Failed to persist switch state for ${this.switchConfig.name}:`, error);
      });
    }
    this.switchService.updateCharacteristic(this.platform.Characteristic.On, this.getStatus());
  }
}
