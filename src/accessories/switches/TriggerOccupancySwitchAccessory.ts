import { SwitchAccessory } from './SwitchAccessory.js';

export class TriggerOccupancySwitchAccessory extends SwitchAccessory {

  protected triggerSwitchOnActions(): void {

    if (this.shouldCancelTimer()) {
      this.occupancySensorAccessory.cancelCurrentUnoccupancyTimer();
      this.occupancySensorAccessory.updateStatusWithNewTriggerInfo(this.switchIdentifier, this.switchType);
      setTimeout(() => this.setStatus(false, { updateCharacteristic: true, triggerSwitchActions: true }), this.MANUAL_STATUS_CHANGE_TIMEOUT);
      this.log.info(` ${this.switchType}: ${this.switchConfig.name} turned ON and keeping occupancy ON`);
      return;
    }

    const occupancyMightChange = this.occupancyMightChange();
    if (!occupancyMightChange) {
      setTimeout(() => this.setStatus(false, { updateCharacteristic: true, triggerSwitchActions: false }), this.MANUAL_STATUS_CHANGE_TIMEOUT);
      return;
    }

    if (!this.enoughTimeHasPassedSinceLastTrigger()) {
      this.log.info(` ${this.switchType}: ${this.switchConfig.name} turned ON but not enough time has passed since last trigger. Ignoring action.`);
      setTimeout(() => this.setStatus(false, { updateCharacteristic: true, triggerSwitchActions: false }), this.MANUAL_STATUS_CHANGE_TIMEOUT);
      return;
    }

    if (this.otherSwitchHasDisabledOccupancy()) {
      this.log.debug(`${this.switchType}: Other switch has disabled occupancy, not changing occupancy status.`);
      setTimeout(() => this.setStatus(false, { updateCharacteristic: true, triggerSwitchActions: false }), this.MANUAL_STATUS_CHANGE_TIMEOUT);
      return;
    }

    this.log.info(` ${this.switchType}: ${this.switchConfig.name} turned ON, setting occupancy to ON`);
    this.occupancySensorAccessory.setOccupancyStatus(true, { switchType: this.switchType, switchIdentifier: this.switchIdentifier });
    setTimeout(() => this.setStatus(false, { updateCharacteristic: true, triggerSwitchActions: true }), this.MANUAL_STATUS_CHANGE_TIMEOUT);

  }

  protected triggerSwitchOffActions(): void {
    const occupancyMightChange = this.occupancyMightChange();
    if (!occupancyMightChange) {
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