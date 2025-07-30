import { Logging } from 'homebridge';
import { SmartOccupancyHomebridgePlatform } from '../../platform.js';
import { SwitchConfig, OccupancySensorConfig } from '../../types/config.js';
import { OccupancySensorAccessory } from '../OccupancySensorAccessory.js';
import { SwitchAccessory } from './SwitchAccessory.js';
    
export class TriggerOccupancySwitchAccessory extends SwitchAccessory {

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
    if (this.switchState.isOn && this.shouldCancelTimer()) {
      this.occupancySensorAccessory.cancelCurrentUnoccupancyTimer();
      this.occupancySensorAccessory.updateTriggerInfo(this.switchIdentifier, this.switchConfig.type);
      setTimeout(() => this.setStatus(false, { updateCharacteristic: true, triggerSwitchActions: true }), this.MANUAL_STATUS_CHANGE_TIMEOUT);
      this.log.info(`Trigger Occupancy switch ${this.switchConfig.type} turned ON and keeping occupancy ON`);
    }
    const occupancyMightChange = this.occupancyMightChange();
    if (!occupancyMightChange) {
      return;
    }
    const shouldGoOccupied = this.shouldGoOccupied();
    if (shouldGoOccupied) {
      this.log.info(`Trigger Occupancy switch ${this.switchConfig.type} turned ON, setting occupancy to ON`);
      this.occupancySensorAccessory.setOccupancyStatus(true, { switchType: this.switchConfig.type, switchIdentifier: this.switchIdentifier });
      setTimeout( () => this.setStatus(false, { updateCharacteristic: true, triggerSwitchActions: true }), this.MANUAL_STATUS_CHANGE_TIMEOUT);
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