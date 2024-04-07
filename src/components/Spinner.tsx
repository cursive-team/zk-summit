import { Icons } from "./Icons";

interface SpinnerProps {
  label?: string; // Optional label to display below the spinner
}

const Spinner = ({ label }: SpinnerProps) => {
  return (
    <div className="flex flex-col gap-6 text-center">
      <div className="mx-auto">
        <Icons.Loading size={28} className="animate-spin text-iron-950" />
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
