import { Logging } from 'homebridge';
import { SmartOccupancyHomebridgePlatform } from '../../platform.js';
import { SwitchConfig, OccupancySensorConfig } from '../../types/config.js';
import { OccupancySensorAccessory } from '../OccupancySensorAccessory.js';
import { SwitchAccessory } from './SwitchAccessory.js';

export class OccupancySwitchAccessory extends SwitchAccessory {

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
    if (this.shouldCancelTimer()) {
      this.occupancySensorAccessory.cancelCurrentUnoccupancyTimer();
      this.occupancySensorAccessory.occupancySensorState.triggeredBySwitchIdentifier = this.switchIdentifier;
      this.occupancySensorAccessory.occupancySensorState.triggeredBySwitchType = this.switchConfig.type;
      this.occupancySensorAccessory.occupancySensorState.lastTriggeredAt = new Date().toISOString();
      this.log.info(`Occupancy switch ${this.switchConfig.type} turned ON, resetting timer and keeping occupancy ON`);
    }
    const occupancyMightChange = this.occupancyMightChange();
    if (!occupancyMightChange) {
      return;
    }
    const shouldGoOccupied = this.shouldGoOccupied();
    if (shouldGoOccupied) {
      this.log.info(`Occupancy switch ${this.switchConfig.type} turned ON, setting occupancy to ON`);
      this.occupancySensorAccessory.setOccupancyStatus(true, { switchType: this.switchConfig.type, switchIdentifier: this.switchIdentifier });
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