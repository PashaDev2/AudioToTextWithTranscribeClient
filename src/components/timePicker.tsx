import { useState, useEffect, useCallback, useMemo } from "react";
import Select from "react-select";

interface TimePickerProps {
    id: string;
    label: string;
    value: string;
    onChange: (v1: string) => void;
    maxDuration: number;
}

export interface SelectValue<T = unknown> {
    value: T;
    label: string;
}

const toOption = (value: number) => ({
    value: value,
    label: String(value).padStart(2, "0"),
});
const fromOption = <T,>(option: SelectValue<T>): T => option.value;

const TimePicker = ({ id, label, value, onChange, maxDuration }: TimePickerProps) => {
    const [hours, minutes, seconds] = useMemo(
        () => (value || "00:00:00").split(":").map(v => parseInt(v, 10)),
        [value]
    );

    const validMaxDuration = maxDuration === Infinity ? 0 : maxDuration;
    const maxHours = Math.floor(validMaxDuration / 3600);
    const maxMinutes = Math.floor((validMaxDuration % 3600) / 60);
    const maxSeconds = Math.floor(validMaxDuration % 60);

    const hoursOptions = Array.from({ length: Math.max(0, maxHours) + 1 }, (_, i) => i);
    const minutesSecondsOptions = Array.from({ length: 60 }, (_, i) => i);

    const [minuteOptions, setMinuteOptions] = useState(minutesSecondsOptions);
    const [secondOptions, setSecondOptions] = useState(minutesSecondsOptions);

    const updateValue = useCallback(
        (newHours: number, newMinutes: number, newSeconds: number) => {
            onChange(
                `${Number.parseInt(`${String(newHours).padStart(2, "0")}`)}:${Number.parseInt(
                    `${String(newMinutes).padStart(2, "0")}`
                )}:${Number.parseInt(`${String(newSeconds).padStart(2, "0")}`)}`
            );
        },
        [onChange]
    );

    const updateMinuteAndSecondOptions = useCallback(
        (newHours: number, newMinutes: number) => {
            const minutesSecondsOptions = Array.from({ length: 60 }, (_, i) => i);
            let newMinuteOptions = minutesSecondsOptions;
            let newSecondOptions = minutesSecondsOptions;
            if (newHours === maxHours) {
                newMinuteOptions = Array.from({ length: Math.max(0, maxMinutes) + 1 }, (_, i) => i);
                if (newMinutes === maxMinutes) {
                    newSecondOptions = Array.from(
                        { length: Math.max(0, maxSeconds) + 1 },
                        (_, i) => i
                    );
                }
            }
            setMinuteOptions(newMinuteOptions);
            setSecondOptions(newSecondOptions);
        },
        [maxHours, maxMinutes, maxSeconds]
    );

    useEffect(() => {
        updateMinuteAndSecondOptions(hours, minutes);
    }, [hours, minutes, updateMinuteAndSecondOptions]);

    return (
        <div className="flex flex-col md:flex-row items-center md:items-start justify-center space-y-2 md:space-y-0 md:space-x-4">
            <label htmlFor={`${id}-hours`} className="mr-2 self-center">
                {label}
            </label>
            <div>
                <div className="flex justify-around mb-1">
                    <span className="text-xs">Hours</span>
                    <span className="text-xs mx-4">Minutes</span>
                    <span className="text-xs">Seconds</span>
                </div>
                <div className="flex items-center space-x-2">
                    <Select
                        id={`${id}-hours`}
                        value={toOption(hours)}
                        onChange={option => {
                            const newHours = fromOption(option as SelectValue<number>);
                            updateValue(newHours, minutes, seconds);
                            updateMinuteAndSecondOptions(newHours, minutes);
                        }}
                        options={hoursOptions.map(toOption)}
                        isSearchable
                    />
                    <span>:</span>
                    <Select
                        id={`${id}-minutes`}
                        value={toOption(minutes)}
                        onChange={option => {
                            const newMinutes = fromOption(option as SelectValue<number>);
                            updateValue(hours, newMinutes, seconds);
                            updateMinuteAndSecondOptions(hours, newMinutes);
                        }}
                        options={minuteOptions.map(toOption)}
                        isSearchable
                    />
                    <span>:</span>
                    <Select
                        id={`${id}-seconds`}
                        value={toOption(seconds)}
                        onChange={option => {
                            const newSeconds = fromOption(option as SelectValue<number>);
                            updateValue(hours, minutes, newSeconds);
                        }}
                        options={secondOptions.map(toOption)}
                        isSearchable
                    />
                </div>
            </div>
        </div>
    );
};

export default TimePicker;
