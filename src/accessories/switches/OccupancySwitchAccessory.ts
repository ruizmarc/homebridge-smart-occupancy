import { SwitchAccessory } from './SwitchAccessory.js';

export class OccupancySwitchAccessory extends SwitchAccessory {

  protected triggerSwitchOnActions(): void {
    const occupancyMightChange = this.occupancyMightChange();
    if (!occupancyMightChange) {
      return;
    }

    if (this.shouldCancelTimer()) {
      this.occupancySensorAccessory.cancelCurrentUnoccupancyTimer();
      this.occupancySensorAccessory.updateStatusWithNewTriggerInfo(this.switchIdentifier, this.switchType);
      this.log.info(`${this.switchType}: ${this.switchConfig.name} turned ON and keeping occupancy ON`);
      return;
    }

    if (!this.enoughTimeHasPassedSinceLastTrigger()) {
      this.log.info(`${this.switchType}: ${this.switchConfig.name} turned ON but not enough time has passed since last trigger. Ignoring action.`);
      setTimeout(() => this.setStatus(false, { updateCharacteristic: true, triggerSwitchActions: false }), this.MANUAL_STATUS_CHANGE_TIMEOUT);
      return;
    }

    this.log.info(`${this.switchType}: ${this.switchConfig.name} turned ON, setting occupancy to ON`);
    this.occupancySensorAccessory.setOccupancyStatus(true, { switchType: this.switchType, switchIdentifier: this.switchIdentifier });
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