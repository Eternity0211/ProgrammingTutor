import * as SliderPrimitive from "@radix-ui/react-slider";

interface StepSliderProps {
  options: number[];
  value: number;
  onChange: (value: number) => void;
}

export function StepSlider({ options, value, onChange }: StepSliderProps) {
  const handleSliderChange = (newValue: number[]) => {
    const index = Math.round((newValue[0] / 100) * (options.length - 1));
    onChange(options[index]);
  };

  const getSliderValue = () => {
    const index = options.indexOf(value);
    return [index * (100 / (options.length - 1))];
  };

  return (
    <div className="pt-2 pb-8">
      <SliderPrimitive.Root
        className="relative flex items-center select-none touch-none w-full h-5"
        value={getSliderValue()}
        onValueChange={handleSliderChange}
        min={0}
        max={100}
        step={100 / (options.length - 1)}
      >
        <SliderPrimitive.Track className="bg-neutral-200 relative grow rounded-full h-2">
          <SliderPrimitive.Range className="absolute bg-primary rounded-full h-full" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className="block w-5 h-5 bg-white border-2 border-primary rounded-full focus:outline-none focus-visible:ring focus-visible:ring-primary focus-visible:ring-opacity-75" />
      </SliderPrimitive.Root>
      <div className="flex justify-between text-sm text-neutral-600 pt-4">
        {options.map((mark, index) => (
          <div key={mark} className="relative flex flex-col items-center">
            <span className="font-medium">
              {mark === 1000
                ? "1k"
                : mark === 1250
                  ? "1.25k"
                  : mark >= 1000
                    ? `${mark / 1000}k`
                    : mark}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
