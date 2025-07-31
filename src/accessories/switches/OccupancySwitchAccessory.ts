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

    const shouldGoOccupied = this.shouldGoOccupied();
    if (shouldGoOccupied) {
      this.log.info(`${this.switchType}: ${this.switchConfig.name} turned ON, setting occupancy to ON`);
      this.occupancySensorAccessory.setOccupancyStatus(true, { switchType: this.switchType, switchIdentifier: this.switchIdentifier });
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