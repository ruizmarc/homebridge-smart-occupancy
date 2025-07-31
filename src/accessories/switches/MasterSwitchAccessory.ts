import { SwitchType } from '../../types/configs.js';
import { SwitchAccessory } from './SwitchAccessory.js';

export class MasterSwitchAccessory extends SwitchAccessory {

  protected triggerSwitchActions(): void {
    this.log.info(`${this.switchType}: ${this.switchConfig.name} changed to ${this.switchState.isOn ? 'ON' : 'OFF'}.`);

    const allSwitches = this.occupancySensorAccessory.switches.values();

    if (this.switchState.isOn) {
      this.occupancySensorAccessory.cancelCurrentUnoccupancyTimer();
      for (const switchAccessory of allSwitches) {
        if (switchAccessory.switchState.isOn
          && switchAccessory.switchType !== SwitchType.PRESENCE_SWITCH
          && switchAccessory.switchIdentifier !== this.switchIdentifier
        ) {
          this.log.debug(`Turning off switch ${switchAccessory.switchIdentifier} as part of master switch turning on action.`);
          switchAccessory.setStatus(false, { updateCharacteristic: true, triggerSwitchActions: false });
        }
      }
      this.occupancySensorAccessory.setOccupancyStatus(true, { switchType: this.switchType, switchIdentifier: this.switchIdentifier });
      return;
    }

    this.occupancySensorAccessory.cancelCurrentUnoccupancyTimer();
    for (const switchAccessory of allSwitches) {
      this.log.debug(`Turning off switch ${switchAccessory.switchIdentifier} as part of master switch turning off action.`);
      if (switchAccessory.switchState.isOn
        && switchAccessory.switchIdentifier !== this.switchIdentifier
      ) {
        switchAccessory.setStatus(false, { updateCharacteristic: true, triggerSwitchActions: false });
      }
    }
    this.occupancySensorAccessory.setOccupancyStatus(false);
  }
}
