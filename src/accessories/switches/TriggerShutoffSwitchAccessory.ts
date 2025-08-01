import { SwitchAccessory } from './SwitchAccessory.js';

export class TriggerShutoffSwitchAccessory extends SwitchAccessory {

  protected triggerSwitchOnActions(): void {
    this.log.info(`${this.switchType}: ${this.switchConfig.name} changed to ON.`);
    setTimeout(() => {
      this.log.info(`${this.switchType}: ${this.switchConfig.name} triggered. Cancelling unoccupy timer and turning off occupancy sensor.`);
      this.occupancySensorAccessory.cancelCurrentUnoccupancyTimer();
      const allSwitches = this.occupancySensorAccessory.switches.values();
      for (const switchAccessory of allSwitches) {
        this.log.debug(`Turning off switch ${switchAccessory.switchIdentifier} as part of shutoff action. ${switchAccessory.switchState.isOn}`);
        if (switchAccessory.switchState.isOn) {
          switchAccessory.setStatus(false, { updateCharacteristic: true, triggerSwitchActions: false });
        }
      }
      this.occupancySensorAccessory.setOccupancyStatus(false);
    }, this.MANUAL_STATUS_CHANGE_TIMEOUT);
  }

  protected triggerSwitchOffActions(): void {
    this.log.info(`${this.switchType}: ${this.switchConfig.name} changed to OFF.`);
  }

}
