import { PlatformConfig } from 'homebridge';

export interface OccupancyPlatformConfig extends PlatformConfig {
    name: string;
    sensors: OccupancySensorConfig[];
}

export interface OccupancySensorConfig {
    name: string;
    identifier: string;
    stayOccupiedDelay: number;
    newOccupancyTimeout: number;
    progressiveDelay: number;
    progressionStart: number;
    progressionStep: number;
    persistStatusAcrossReboots: boolean;
    alwaysBootAsOccupied: boolean;
    switches: (SwitchConfig | NotificationSwitchConfig)[];
}

export interface SwitchConfig {
    name: string;
    type: SwitchType;
}

export interface NotificationSwitchConfig extends SwitchConfig {
    type: SwitchType.NOTIFICATION_SWITCH;
    notificationThreshold: number;
    minimumNotificationTime: number;
}

export enum SwitchType {
    LIGHT_SWITCH,
    NOTIFICATION_SWITCH,
    OCCUPANCY_SWITCH,
    TRIGGER_OCCUPANCY_SWITCH,
    STAY_ON_SWITCH,
    TRIGGER_STAY_ON_SWITCH,
    SHUTOFF_SWITCH,
}