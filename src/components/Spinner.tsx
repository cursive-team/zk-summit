import { Icons } from "./Icons";

interface SpinnerProps {
  label?: string; // Optional label to display below the spinner
  size?: number;
  className?: string;
}

const Spinner = ({ label, size = 28, className }: SpinnerProps) => {
  return (
    <div className="flex flex-col gap-6 text-center">
      <div className="mx-auto">
        <Icons.Loading
          size={size}
          className={`animate-spin text-iron-950 ${className}`}
        />
      </div>
      {label && (
        <span className="text-sm text-iron-600 leading-5 font-normal">
          {label}
        </span>
      )}
    </div>
  );
};

Spinner.displayName = "Spinner";

export { Spinner };
