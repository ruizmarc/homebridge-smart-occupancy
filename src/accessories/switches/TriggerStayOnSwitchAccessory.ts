import { Logging } from 'homebridge';
import { SmartOccupancyHomebridgePlatform } from '../../platform.js';
import { SwitchConfig, OccupancySensorConfig } from '../../types/config.js';
import { OccupancySensorAccessory } from '../OccupancySensorAccessory.js';
import { SwitchAccessory } from './SwitchAccessory.js';

export class TriggerStayOnSwitchAccessory extends SwitchAccessory {

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
      this.log.info(`Trigger Stay On switch ${this.switchConfig.name} turned ${this.switchState.isOn ? 'ON' : 'OFF'}, ` +
        'but occupancy is already OFF. Ignoring action.');
      if (this.switchState.isOn) {
        setTimeout(() => this.setStatus(false, { updateCharacteristic: true, triggerSwitchActions: false }), 100);
      }
      return;
    }

    if (this.switchState.isOn && this.shouldCancelTimer()) {
      this.occupancySensorAccessory.cancelCurrentUnoccupancyTimer();
      this.occupancySensorAccessory.updateTriggerInfo(this.switchIdentifier, this.switchConfig.type);
      this.log.info(`Trigger Stay On switch ${this.switchConfig.name} turned ON, resetting timer and keeping occupancy ON`);
      setTimeout(() => this.setStatus(false), 100);
      return;
    }

    if (this.switchState.isOn) {
      this.log.info(`Trigger Stay On switch ${this.switchConfig.name} turned ON with no action needed`);
      setTimeout(() => this.setStatus(false, { updateCharacteristic: true, triggerSwitchActions: false }), 100);
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

