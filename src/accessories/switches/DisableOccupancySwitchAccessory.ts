import { SwitchAccessory } from './SwitchAccessory.js';

export class DisableOccupancySwitchAccessory extends SwitchAccessory {

  protected triggerSwitchOnActions(): void {
    this.occupancySensorAccessory.cancelCurrentUnoccupancyTimer();
    const allSwitches = this.occupancySensorAccessory.switches.values();
    for (const switchAccessory of allSwitches) {
      this.log.debug(`Turning off switch ${switchAccessory.switchIdentifier} as part of shutoff action. ${switchAccessory.switchState.isOn}`);
      if (switchAccessory.switchState.isOn && switchAccessory.switchIdentifier !== this.switchIdentifier) {
        switchAccessory.setStatus(false, { updateCharacteristic: true, triggerSwitchActions: false });
      }
    }
    this.occupancySensorAccessory.setOccupancyStatus(false);
  }

  protected triggerSwitchOffActions(): void {
    this.log.info(`${this.switchType}: ${this.switchConfig.name} changed to OFF.`);
  }

}
