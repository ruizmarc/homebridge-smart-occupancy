import { SwitchAccessory } from './SwitchAccessory.js';

export class TriggerOccupancySwitchAccessory extends SwitchAccessory {

  protected triggerSwitchOnActions(): void {

    if (this.shouldCancelTimer()) {
      this.occupancySensorAccessory.cancelCurrentUnoccupancyTimer();
      this.occupancySensorAccessory.updateStatusWithNewTriggerInfo(this.switchIdentifier, this.switchType);
      setTimeout(() => this.setStatus(false, { updateCharacteristic: true, triggerSwitchActions: true }), this.MANUAL_STATUS_CHANGE_TIMEOUT);
      this.log.info(` ${this.switchType}: Trigger Occupancy switch ${this.switchConfig.name} turned ON and keeping occupancy ON`);
      return;
    }

    const occupancyMightChange = this.occupancyMightChange();
    if (!occupancyMightChange) {
      setTimeout(() => this.setStatus(false, { updateCharacteristic: true, triggerSwitchActions: true }), this.MANUAL_STATUS_CHANGE_TIMEOUT);
      return;
    }

    const shouldGoOccupied = this.shouldGoOccupied();
    if (shouldGoOccupied) {
      this.log.info(` ${this.switchType}: Trigger Occupancy switch ${this.switchConfig.name} turned ON, setting occupancy to ON`);
      this.occupancySensorAccessory.setOccupancyStatus(true, { switchType: this.switchType, switchIdentifier: this.switchIdentifier });
      setTimeout(() => this.setStatus(false, { updateCharacteristic: true, triggerSwitchActions: true }), this.MANUAL_STATUS_CHANGE_TIMEOUT);
      return;
    }

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