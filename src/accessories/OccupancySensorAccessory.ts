import type { CharacteristicValue, Logging, PlatformAccessory, Service } from 'homebridge';

import type { SmartOccupancyHomebridgePlatform } from '../platform.js';
import { OccupancySensorConfig, SwitchType } from '../types/config.js';
import { SwitchAccessory } from './SwitchAccessory.js';
import { StorageLayer } from '../utils/StorageLayer.js';
import { Observable, Subject, takeUntil, timer } from 'rxjs';

interface OccupancySensorState {
  occupied: boolean;
  triggeredBySwitchIdentifier?: string;
  triggeredBySwitchType?: SwitchType;
  lastTriggeredAt?: string; // ISO date string
}

interface SwitchEvent {
  switchIdentifier: string;
  switchType: SwitchType;
  turnedOn: boolean;
}

export class OccupancySensorAccessory {
  private occupancySensorService!: Service;

  private occupancySensorState: OccupancySensorState = {
    occupied: false,
  };

  private storage: StorageLayer;

  private switches: Map<string, SwitchAccessory> = new Map();

  private log: Logging;

  private timerStartedSubject = new Subject<boolean>();
  public timerStarted$ = this.timerStartedSubject.asObservable();

  private timerFinishedSubject = new Subject<boolean>();
  public timerFinished$ = this.timerFinishedSubject.asObservable();

  private timerCancelledSubject = new Subject<boolean>();
  public timerCancelled$ = this.timerCancelledSubject.asObservable();

  public switchEventSubject = new Subject<SwitchEvent>();

  private timerToUnoccupy$?: Observable<0>;

  constructor(
    private readonly platform: SmartOccupancyHomebridgePlatform,
    private readonly occupancySensorConfig: OccupancySensorConfig,
    public readonly occupancySensorAccessory: PlatformAccessory,
    private readonly persistPath: string,
  ) {
    this.storage = new StorageLayer(this.persistPath);
    this.log = platform.log;

    this.initAccessoryInformation();
    this.initSwitches();

    this.initSensorStatus().catch((error) => {
      this.log.error(`Failed to initialize occupancy sensor status for ${occupancySensorConfig.name}:`, error);
    });

    this.subscribeToSwitchChanges();
  }

  private initAccessoryInformation() {
    this.occupancySensorAccessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'SmartOccupancy')
      .setCharacteristic(this.platform.Characteristic.Model, 'Occupancy Sensor')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'smart-occupancy-sensor');

    this.occupancySensorService = this.occupancySensorAccessory.getService(this.platform.Service.OccupancySensor)
      ?? this.occupancySensorAccessory.addService(this.platform.Service.OccupancySensor);

    this.occupancySensorService.setCharacteristic(this.platform.Characteristic.Name, this.occupancySensorAccessory.displayName);

    this.occupancySensorService.getCharacteristic(this.platform.Characteristic.OccupancyDetected)
      .onSet(this.setOccupancy.bind(this))
      .onGet(this.getOccupancy.bind(this));
  }

  private initSwitches() {
    for (const switchConfig of (this.occupancySensorConfig.switches ?? [])) {
      const switchAccessory = new SwitchAccessory(
        this.platform,
        this,
        switchConfig,
        this.occupancySensorConfig,
        this.persistPath,
        this.platform.log,
      );
      this.switches.set(switchAccessory.switchIdentifier, switchAccessory);
    }
    const currentSwitchIdentifiers = new Set(Array.from(this.switches.values())
      .map((switchAccessory) => switchAccessory.switchService.UUID + switchAccessory.switchService.subtype));

    const currentRegisteredSwitchServicesMap = new Map<string, Service>();
    const registeredSwitchServices = new Set(
      this.occupancySensorAccessory.services
        .filter((service) => service.subtype?.endsWith('SWITCH'))
        .map(switchService => {
          const switchIdentifier = switchService.UUID + switchService.subtype;
          currentRegisteredSwitchServicesMap.set(switchIdentifier, switchService);
          return switchIdentifier;
        }));

    for (const registeredSwitchService of registeredSwitchServices) {
      if (!currentSwitchIdentifiers.has(registeredSwitchService)) {
        this.log.warn(`Switch service with UUID ${registeredSwitchService} not found in registered services, removing it now.`);
        const serviceToRemove = currentRegisteredSwitchServicesMap.get(registeredSwitchService);
        if (serviceToRemove) {
          this.occupancySensorAccessory.removeService(serviceToRemove);
        }
      }
    }
    this.log(JSON.stringify(this.occupancySensorAccessory.services, null, 2));
  }

  private async initSensorStatus() {
    if (this.occupancySensorConfig.persistStatusAcrossReboots) {
      await this.storage.init();
      const persistedState = await this.storage.getItem<OccupancySensorState>(this.occupancySensorAccessory.UUID);
      if (!persistedState) {
        this.log.warn(`No persisted state found for switch ${this.occupancySensorConfig.name}, initializing to OFF`);
        this.setOccupancyStatus(false);
        return;
      }
      this.log.info(`Occupancy sensor ${this.occupancySensorConfig.name} restored state: ${this.occupancySensorState.occupied}`);
      this.setOccupancyStatus(persistedState.occupied);
      return;
    }
    if (this.occupancySensorConfig.alwaysBootAsOccupied) {
      this.log.info(`Occupancy sensor ${this.occupancySensorConfig.name} initialized as ON`);
      this.setOccupancyStatus(true);
      return;
    }
  }

  private subscribeToSwitchChanges() {
    this.switchEventSubject.subscribe((event) => {
      this.log.debug(`Switch event received: ${event.switchType} turned ${event.turnedOn ? 'ON' : 'OFF'}`);

      switch (event.switchType) {
      case SwitchType.PRESENCE_SWITCH: {
        this.handlePresenceSwitchEvent(event);
        break;
      }
      case SwitchType.OCCUPANCY_SWITCH: {
        this.handleOccupancySwitchEvent(event);
        break;
      }
      case SwitchType.TRIGGER_OCCUPANCY_SWITCH: {
        // Handle trigger occupancy switch events
        break;
      }
      case SwitchType.NOTIFICATION_SWITCH: {
        // Handle notification switch events
        break;
      }
      case SwitchType.STAY_ON_SWITCH: {
        // Handle stay on switch events
        break;
      }
      case SwitchType.TRIGGER_STAY_ON_SWITCH: {
        // Handle trigger stay on switch events
        break;
      }
      case SwitchType.SHUTOFF_SWITCH: {
        // Handle shutoff switch events
        break;
      }
      default: {
        this.log.warn(`Unhandled switch type: ${event.switchType}`);
        break;
      }
      }
    });

  }

  async setOccupancy(value: CharacteristicValue) {
    this.log.debug('Triggered SET Occupancy:', value);
    this.setOccupancyStatus(Boolean(value), undefined, { updateAccessoryService: false });
  }

  async getOccupancy(): Promise<CharacteristicValue> {
    this.log.debug('Triggered GET Occupancy');
    return this.getOccupancyStatusCharacteristicValue();
  }

  private getOccupancyStatusCharacteristicValue(): number {
    return Number(this.occupancySensorState.occupied);
  }

  private setOccupancyStatus(
    occupied: boolean,
    triggeredBy: { switchType: SwitchType; switchIdentifier: string } | null = null,
    options: { updateAccessoryService?: boolean } = { updateAccessoryService: true },
  ) {
    this.log.debug('Setting occupancy status to:', occupied);
    this.occupancySensorState.occupied = occupied;
    this.occupancySensorState.triggeredBySwitchType = triggeredBy?.switchType;
    this.occupancySensorState.triggeredBySwitchIdentifier = triggeredBy?.switchIdentifier;
    if (this.occupancySensorState.occupied) {
      this.occupancySensorState.lastTriggeredAt = new Date().toISOString();
    }
    if (this.occupancySensorConfig.persistStatusAcrossReboots) {
      this.storage.setItem(this.occupancySensorAccessory.UUID, this.occupancySensorState).catch((error) => {
        this.log.error(`Failed to persist occupancy sensor state for ${this.occupancySensorConfig.name}:`, error);
      });
    }
    if (options.updateAccessoryService) {
      this.occupancySensorService.updateCharacteristic(this.platform.Characteristic.OccupancyDetected, this.getOccupancyStatusCharacteristicValue());
    }
  }

  private handlePresenceSwitchEvent(event: SwitchEvent) {
    const occupancyMightChange = this.checkIfOccupancyMightChange(event);
    if (!occupancyMightChange) {
      return;
    }

    const shouldGoOccupied = this.checkIfShouldGoOccupied(event);
    if (shouldGoOccupied) {
      this.log.info(`Presence switch ${event.switchType} turned ON, setting occupancy to ON`);
      this.setOccupancyStatus(true, { switchType: event.switchType, switchIdentifier: event.switchIdentifier });
      return;
    }

    const shouldGoUnoccupied = !event.turnedOn
      && this.occupancySensorState.occupied
      && this.occupancySensorState.triggeredBySwitchType === event.switchType
      && this.occupancySensorState.triggeredBySwitchIdentifier === event.switchIdentifier;

    if (shouldGoUnoccupied) {
      this.log.info(`Presence switch ${event.switchType} turned OFF, setting occupancy to OFF`);
      this.setOccupancyStatus(false, { switchType: event.switchType, switchIdentifier: event.switchIdentifier });
      return;
    }
  }

  private handleOccupancySwitchEvent(event: SwitchEvent) {
    if (this.checkIfShouldCancelTimer(event)) {
      this.cancelCurrentUnoccupyTimer();
      this.occupancySensorState.triggeredBySwitchIdentifier = event.switchIdentifier;
      this.occupancySensorState.triggeredBySwitchType = event.switchType;
      this.occupancySensorState.lastTriggeredAt = new Date().toISOString();
      this.log.info(`Occupancy switch ${event.switchType} turned ON, resetting timer and keeping occupancy ON`);
    }
    const occupancyMightChange = this.checkIfOccupancyMightChange(event);
    if (!occupancyMightChange) {
      return;
    }
    const shouldGoOccupied = this.checkIfShouldGoOccupied(event);
    if (shouldGoOccupied) {
      this.log.info(`Occupancy switch ${event.switchType} turned ON, setting occupancy to ON`);
      this.setOccupancyStatus(true, { switchType: event.switchType, switchIdentifier: event.switchIdentifier });
      return;
    }
    const shouldStartTimerToUnoccupy = !event.turnedOn
      && this.occupancySensorState.occupied
      && this.occupancySensorState.triggeredBySwitchType === event.switchType
      && this.occupancySensorState.triggeredBySwitchIdentifier === event.switchIdentifier;

    if (shouldStartTimerToUnoccupy) {
      this.startUnoccupyTimer();
    }
  }

  private checkIfShouldCancelTimer(event: SwitchEvent): boolean {
    return this.occupancySensorState.occupied
      && event.turnedOn
      && this.occupancySensorState.triggeredBySwitchType === event.switchType;
  }

  private checkIfOccupancyMightChange(event: SwitchEvent): boolean {
    if (this.occupancySensorState.occupied && event.turnedOn) {
      this.log.debug(`Occupancy is already ON, ignoring switch ${event.switchType} turned ON event.`);
      return false;
    }
    if (!this.occupancySensorState.occupied && !event.turnedOn) {
      this.log.debug(`Occupancy is already OFF, ignoring switch ${event.switchType} turned OFF event.`);
      return false;
    }
    return true;
  }

  private checkIfShouldGoOccupied(event: SwitchEvent): boolean {
    return event.turnedOn
      && !this.occupancySensorState.occupied
      && this.checkIfEnoughTimePassedSinceLastTrigger();
  }

  private checkIfEnoughTimePassedSinceLastTrigger(): boolean {
    if (!this.occupancySensorState.lastTriggeredAt) {
      return true;
    }
    const lastTriggeredTime = new Date(this.occupancySensorState.lastTriggeredAt).getTime();
    const currentTime = Date.now();
    const timeDifference = currentTime - lastTriggeredTime;
    return timeDifference >= (this.occupancySensorConfig.newOccupancyTimeout ?? 0) * 1000;
  }

  private startUnoccupyTimer() {
    this.cancelCurrentUnoccupyTimer();
    this.log.debug(`Starting timer to unoccupy after delay: ${this.occupancySensorConfig.stayOccupiedDelay}`);
    this.timerToUnoccupy$ = timer(this.occupancySensorConfig.stayOccupiedDelay * 1000);
    this.timerToUnoccupy$.pipe(
      takeUntil(this.timerCancelledSubject),
    )
      .subscribe(() => {
        this.timerToUnoccupy$ = undefined;
        this.log.info('Timer finished, setting occupancy to OFF');
        this.setOccupancyStatus(false, undefined, { updateAccessoryService: true });
        this.timerFinishedSubject.next(true);
      });
    this.timerStartedSubject.next(true);
  }

  private cancelCurrentUnoccupyTimer() {
    if (this.timerToUnoccupy$) {
      this.log.debug('Cancelling current unoccupy timer');
      this.timerCancelledSubject.next(true);
      this.timerToUnoccupy$ = undefined;
    } else {
      this.log.debug('No current unoccupy timer to cancel');
    }
  }

}
