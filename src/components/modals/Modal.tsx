import { Transition, Dialog } from "@headlessui/react";
import React, { Fragment } from "react";
import { Icons } from "../Icons";
import { cn } from "@/lib/client/utils";

export interface ModalProps
  extends Pick<React.HTMLAttributes<HTMLDivElement>, "children"> {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  children?: React.ReactNode;
  closable?: boolean;
  onClose?: () => void;
  withBackButton?: boolean;
}

const Modal = ({
  isOpen,
  setIsOpen,
  children,
  closable = true, // show close button when active
  onClose, // run when modal close
  withBackButton = false, // show back button when active
}: ModalProps) => {
  const onCloseModal = () => {
    onClose?.();
    setIsOpen(false);
  };

  if (!isOpen) return null;
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[100]" onClose={onCloseModal}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25 z-[100]" />
        </Transition.Child>

        <div
          data-component="modal"
          className="fixed inset-0 overflow-y-auto z-[100]"
        >
          <div className="flex min-h-full w-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="bg-black fixed top-0 bottom-0 left-0 right-0 bg-shark-970 w-full max-h-screen transform py-6 px-3 xs:px-4 text-left align-middle shadow-xl transition-all">
                {closable && (
                  <div
                    className={cn(
                      "fixed z-100 top-0 flex items-center h-12 py-8",
                      withBackButton ? "left-4" : "right-[24px]"
                    )}
                  >
                    <button
                      type="button"
                      className="ring-0 focus:outline-none outline-none cursor-pointer"
                      onClick={onCloseModal}
                    >
                      {withBackButton ? (
                        <div className="flex items-center gap-1">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="none"
                          >
                            <path
                              fillRule="evenodd"
                              clipRule="evenodd"
                              d="M5.29297 7.99991L9.00009 4.29294L9.70718 5.00006L6.70718 7.99994L9.70718 11.0001L9.00006 11.7072L5.29297 7.99991Z"
                              fill="#B1B1B1"
                            />
                          </svg>
                          <span className="text-gray-11 text-sm">Back</span>
                        </div>
                      ) : (
                        <Icons.Close />
                      )}
                    </button>
                  </div>
                )}
                <div className="flex flex-col grow h-full overflow-y-auto mt-8 z-100">
                  <div className="pt-4 pb-6">{children}</div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

Modal.displayName = "Modal";

export { Modal };
