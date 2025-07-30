import { Logging } from 'homebridge';
import { SmartOccupancyHomebridgePlatform } from '../../platform.js';
import { SwitchConfig, OccupancySensorConfig } from '../../types/config.js';
import { OccupancySensorAccessory } from '../OccupancySensorAccessory.js';
import { SwitchAccessory } from './SwitchAccessory.js';

export class StayOnSwitchAccessory extends SwitchAccessory {

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
    if (!this.occupancySensorAccessory.occupancySensorState.occupied) {
      this.log.info(`Stay On switch ${this.switchConfig.name} turned ${this.switchState.isOn ? 'ON' : 'OFF'}, but occupancy is already OFF. Ignoring action.`);
      return;
    }
    if (this.shouldCancelTimer()) {
      this.occupancySensorAccessory.cancelCurrentUnoccupancyTimer();
      this.occupancySensorAccessory.occupancySensorState.triggeredBySwitchIdentifier = this.switchIdentifier;
      this.occupancySensorAccessory.occupancySensorState.triggeredBySwitchType = this.switchConfig.type;
      this.occupancySensorAccessory.occupancySensorState.lastTriggeredAt = new Date().toISOString();
      this.log.info(`Stay On switch ${this.switchConfig.name} turned ON, resetting timer and keeping occupancy ON`);
      return;
    }

    const shouldStartTimerToUnoccupy = !this.switchState.isOn
      && this.occupancySensorAccessory.occupancySensorState.occupied
      && !this.otherSwitchesAreBlockingUnoccupyChange();

    if (shouldStartTimerToUnoccupy) {
      this.occupancySensorAccessory.startUnoccupyTimer();
    }

  }
}

