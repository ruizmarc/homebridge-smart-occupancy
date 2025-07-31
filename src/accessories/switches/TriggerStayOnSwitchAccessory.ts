import { SwitchAccessory } from './SwitchAccessory.js';

export class TriggerStayOnSwitchAccessory extends SwitchAccessory {


  protected triggerSwitchActions(): void {
    if (!this.occupancySensorAccessory.occupancySensorState.occupied) {
      this.log.info(`${this.switchType}: Trigger Stay On switch ${this.switchConfig.name} turned ${this.switchState.isOn ? 'ON' : 'OFF'}, ` +
        'but occupancy is already OFF. Ignoring action.');
      if (this.switchState.isOn) {
        setTimeout(() => this.setStatus(false, { updateCharacteristic: true, triggerSwitchActions: false }), this.MANUAL_STATUS_CHANGE_TIMEOUT);
      }
      return;
    }

    if (this.switchState.isOn && this.shouldCancelTimer()) {
      this.occupancySensorAccessory.cancelCurrentUnoccupancyTimer();
      this.occupancySensorAccessory.updateStatusWithNewTriggerInfo(this.switchIdentifier, this.switchType);
      this.log.info(`${this.switchType}: Trigger Stay On switch ${this.switchConfig.name} turned ON and keeping occupancy ON`);
      setTimeout(() => this.setStatus(false), this.MANUAL_STATUS_CHANGE_TIMEOUT);
      return;
    } else if (this.switchState.isOn) {
      this.log.info(`${this.switchType}: Trigger Stay On switch ${this.switchConfig.name} turned ON, no action required`);
      this.occupancySensorAccessory.updateStatusWithNewTriggerInfo(this.switchIdentifier, this.switchType);
      setTimeout(() => this.setStatus(false, { updateCharacteristic: true, triggerSwitchActions: false }), this.MANUAL_STATUS_CHANGE_TIMEOUT);
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

