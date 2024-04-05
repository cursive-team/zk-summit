"use client";

import { ReactNode } from "react";

type FormStepLayoutProps = {
  title?: ReactNode;
  description?: string;
  subtitle?: ReactNode;
  children: React.ReactNode;
  header?: React.ReactNode;
  onSubmit?: (event: React.FormEvent) => void;
  onChange?: (formValues: any) => void;
  className?: string;
  actions?: React.ReactNode; // actions are the buttons at the bottom of the form
};

const FormStepLayout = ({
  title,
  description,
  children,
  header,
  className = "",
  actions,
  onChange,
  subtitle,
  ...props
}: FormStepLayoutProps) => {
  return (
    <form
      {...props}
      className={`flex flex-col w-full grow focus ${className}`}
      onChange={onChange}
    >
      <div className="flex flex-col gap-3 xs:gap-8">
        <div className="flex flex-col gap-1 xs:mb-4">
          <div className="flex flex-col gap-3">
            {description && (
              <span className="font-normal text-[13px] leading-[18px] text-black">
                {description}
              </span>
            )}
            {title && (
              <>
                {typeof title === "string" ? (
                  <h3 className="font-medium text-primary text-[21px] leading-[21px]">
                    {title}
                  </h3>
                ) : (
                  title
                )}
              </>
            )}
            {subtitle && (
              <span className="font-normal text-[13px] leading-[18px] text-black">
                {subtitle}
              </span>
            )}
          </div>
        </div>
        {header}
      </div>
      {children && (
        <div className="flex flex-col gap-6 w-full mt-auto mb-4">
          {children}
        </div>
      )}
      {actions && (
        <div className="sticky bottom-0 right-0 left-0 mt-4">
          <div className="pb-6 pt-2">{actions}</div>
        </div>
      )}
    </form>
  );
};

FormStepLayout.displayName = "FormStepLayout";

export { FormStepLayout };
