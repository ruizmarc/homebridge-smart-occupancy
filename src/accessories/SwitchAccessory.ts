import type { CharacteristicValue, Logging, Service } from 'homebridge';

import type { SmartOccupancyHomebridgePlatform } from '../platform.js';
import { SwitchConfig } from '../types/config.js';
import { OccupancySensorAccessory } from './OccupancySensorAccessory.js';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class SwitchAccessory {

  private switchService: Service;

  /**
   * These are just used to create a working example
   * You should implement your own code to track the state of your accessory
   */
  private currentState = false;

  constructor(
    private readonly platform: SmartOccupancyHomebridgePlatform,
    private readonly occupancySensorAccessory: OccupancySensorAccessory,
    private readonly switchConfig: SwitchConfig,
    private log: Logging,
  ) {

    const switchServiceSubtype = `${switchConfig.name}-${switchConfig.type}`;

    this.switchService = this.occupancySensorAccessory.platformAccessory.getService(switchServiceSubtype)
      ?? this.occupancySensorAccessory.platformAccessory.addService(this.platform.Service.Switch, switchConfig.name, switchServiceSubtype);
      
    this.switchService.setCharacteristic(this.platform.Characteristic.ConfiguredName, switchConfig.name);

    this.switchService.getCharacteristic(this.platform.Characteristic.On)
      .onGet(this.handleOnGet.bind(this))
      .onSet(this.handleOnSet.bind(this));

  }

  /**
   * Handle requests to get the current value of the "On" characteristic
   */
  handleOnGet(): CharacteristicValue {
    this.log.debug('Triggered GET On');
    return this.currentState;
  }

  /**
   * Handle requests to set the "On" characteristic
   */
  handleOnSet(value: CharacteristicValue) {
    this.log.debug('Triggered SET On:', value);
    this.currentState = !!value;
  }

}
