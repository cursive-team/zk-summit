import { classed } from "@tw-classed/react";
import React, { useEffect } from "react";
import { Transition } from "@headlessui/react";
import { cn } from "@/lib/client/utils";

interface LoadingWrapper {
  isLoading: boolean;
  children: React.ReactNode;
  fallback: React.ReactNode; // If you want to show something else while loading
  authRequired?: boolean;
  className?: string;
  noResultsLabel?: string;
}

const NoItemLabel = classed.span("text-sm text-iron-600 font-bold py-4");

const MIN_LOADING_TIME = 200;
const LoadingWrapper = ({
  isLoading,
  children,
  fallback,
  className = "",
  noResultsLabel = "No items",
}: LoadingWrapper) => {
  const noItems = !isLoading && React.Children.count(children) === 0;
  const [isPending, setIsPending] = React.useState(true);

  // show loading for at least 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsPending(false);
    }, MIN_LOADING_TIME);
    return () => clearTimeout(timer);
  }, []);

  const loading = isPending || isLoading;

  return (
    <>
      {loading && <div className={className}>{fallback}</div>}
      <Transition
        show={!loading}
        enter="transition-opacity duration-200"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="transition-opacity duration-150"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <div className={className}>
          {noItems ? <NoItemLabel>{noResultsLabel}</NoItemLabel> : children}
        </div>
      </Transition>
    </>
  );
};

LoadingWrapper.displayName = "LoadingWrapper";

export { LoadingWrapper };
