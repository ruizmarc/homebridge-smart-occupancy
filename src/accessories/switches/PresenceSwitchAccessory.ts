import { Logging } from 'homebridge';
import { SmartOccupancyHomebridgePlatform } from '../../platform.js';
import { SwitchConfig, OccupancySensorConfig } from '../../types/config.js';
import { OccupancySensorAccessory } from '../OccupancySensorAccessory.js';
import { SwitchAccessory } from './SwitchAccessory.js';

export class PresenceSwitchAccessory extends SwitchAccessory {

  constructor(
    platform: SmartOccupancyHomebridgePlatform,
    occupancySensorAccessory: OccupancySensorAccessory,
    switchConfig: SwitchConfig,
    sensorConfig: OccupancySensorConfig,
    persistPath: string,
    log: Logging,
  ) {
    super(platform, occupancySensorAccessory, switchConfig, sensorConfig, persistPath, log);
  }

  protected triggerSwitchActions(): void {
    const occupancyMightChange = this.occupancyMightChange();
    if (!occupancyMightChange) {
      return;
    }

    const shouldGoOccupied = this.shouldGoOccupied();
    if (shouldGoOccupied) {
      this.log.info(`${this.switchConfig.type}: ${this.switchConfig.name} turned ON, setting occupancy to ON`);
      this.occupancySensorAccessory.setOccupancyStatus(true, { switchType: this.switchConfig.type, switchIdentifier: this.switchIdentifier });
      return;
    }
    
    const triggerSwitchIsMyself = this.occupancySensorAccessory.occupancySensorState.triggeredBySwitchType === this.switchConfig.type
      && this.occupancySensorAccessory.occupancySensorState.triggeredBySwitchIdentifier === this.switchIdentifier;

    const shouldGoUnoccupied = !this.switchState.isOn
      && this.occupancySensorAccessory.occupancySensorState.occupied
      && triggerSwitchIsMyself;

    if (shouldGoUnoccupied) {
      this.log.info(`${this.switchConfig.type}: ${this.switchConfig.name} turned OFF, setting occupancy to OFF`);
      this.occupancySensorAccessory.setOccupancyStatus(false, { switchType: this.switchConfig.type, switchIdentifier: this.switchIdentifier });
      return;
    }
  }
}