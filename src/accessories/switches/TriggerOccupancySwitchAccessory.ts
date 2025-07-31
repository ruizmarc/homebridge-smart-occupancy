import { SwitchAccessory } from './SwitchAccessory.js';
    
export class TriggerOccupancySwitchAccessory extends SwitchAccessory {


  protected triggerSwitchActions(): void {
    if (this.switchState.isOn && this.shouldCancelTimer()) {
      this.occupancySensorAccessory.cancelCurrentUnoccupancyTimer();
      this.occupancySensorAccessory.updateStatusWithNewTriggerInfo(this.switchIdentifier, this.switchConfig.type);
      setTimeout(() => this.setStatus(false, { updateCharacteristic: true, triggerSwitchActions: true }), this.MANUAL_STATUS_CHANGE_TIMEOUT);
      this.log.info(` ${this.switchConfig.type}: Trigger Occupancy switch ${this.switchConfig.name} turned ON and keeping occupancy ON`);
      return;
    }
    const occupancyMightChange = this.occupancyMightChange();
    if (!occupancyMightChange) {
      return;
    }
    const shouldGoOccupied = this.shouldGoOccupied();
    if (shouldGoOccupied) {
      this.log.info(` ${this.switchConfig.type}: Trigger Occupancy switch ${this.switchConfig.name} turned ON, setting occupancy to ON`);
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