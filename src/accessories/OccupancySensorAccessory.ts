import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';

import type { SmartOccupancyHomebridgePlatform } from '../platform.js';
import { OccupancySensorConfig } from '../types/config.js';
import { SwitchAccessory } from './SwitchAccessory.js';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class OccupancySensorAccessory {
  private service: Service;

  /**
   * These are just used to create a working example
   * You should implement your own code to track the state of your accessory
   */
  private exampleStates = {
    On: false,
    Brightness: 100,
  };

  private switches: Map<string, SwitchAccessory> = new Map();

  constructor(
    private readonly platform: SmartOccupancyHomebridgePlatform,
    private readonly occupancySensorConfig: OccupancySensorConfig,
    public readonly platformAccessory: PlatformAccessory,
  ) {
    // set accessory information
    this.platformAccessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'SmartOccupancy')
      .setCharacteristic(this.platform.Characteristic.Model, 'Occupancy Sensor')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'smart-occupancy-sensor');

    this.service = this.platformAccessory.getService(this.platform.Service.OccupancySensor)
      ?? this.platformAccessory.addService(this.platform.Service.OccupancySensor);

    this.service.setCharacteristic(this.platform.Characteristic.Name, platformAccessory.displayName);

    this.service.getCharacteristic(this.platform.Characteristic.OccupancyDetected)
      .onSet(this.setOccupancy.bind(this))
      .onGet(this.getOccupancy.bind(this));

    for (const switchConfig of (this.occupancySensorConfig.switches ?? [])) {
      const switchAccessory = new SwitchAccessory(this.platform, this, switchConfig, this.platform.log);
      this.switches.set(switchConfig.name, switchAccessory);
    }
  }
  
  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  async setOccupancy(value: CharacteristicValue) {
    // implement your own code to turn your device on/off
    this.exampleStates.On = value as boolean;

    this.platform.log.debug('Set Characteristic On ->', value);
  }

  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory, for example, checking if a Light bulb is on.
   *
   * GET requests should return as fast as possible. A long delay here will result in
   * HomeKit being unresponsive and a bad user experience in general.
   *
   * If your device takes time to respond you should update the status of your device
   * asynchronously instead using the `updateCharacteristic` method instead.
   * In this case, you may decide not to implement `onGet` handlers, which may speed up
   * the responsiveness of your device in the Home app.

   * @example
   * this.service.updateCharacteristic(this.platform.Characteristic.On, true)
   */
  async getOccupancy(): Promise<CharacteristicValue> {
    // implement your own code to check if the device is on
    const isOn = this.exampleStates.On;

    this.platform.log.debug('Get Characteristic On ->', isOn);

    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);

    return isOn;
  }
}
