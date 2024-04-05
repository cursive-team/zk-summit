import { Tab } from "@headlessui/react";
import { classed } from "@tw-classed/react";

interface TabProps {
  label: string;
  badge?: boolean;
  children: React.ReactNode;
}

export interface TabsProps {
  items: TabProps[];
}

const TabButton = classed.div("font-bold pb-[14px]", {
  variants: {
    selected: {
      true: "text-iron-950",
      false: "text-iron-600",
    },
  },
  defaultVariants: {
    selected: false,
  },
});

const TabBadge = classed.div(
  "absolute -top-0.5 -right-2 bg-[#D40018] rounded-full text-white w-[6px] h-[6px] text-[8px]"
);

const Tabs = ({ items }: TabsProps) => {
  return (
    <Tab.Group>
      <Tab.List className="flex gap-8 relative">
        {items.map(({ label, badge }, index) => {
          return (
            <Tab className="outline-none" key={index}>
              {({ selected }) => (
                <div className="relative">
                  <TabButton selected={selected}>
                    <span className="relative">
                      {label}
                      {badge && <TabBadge />}
                    </span>
                  </TabButton>
                  {selected && (
                    <div className="absolute bg-iron-950 bottom-0 h-[1px] w-full z-[1]"></div>
                  )}
                </div>
              )}
            </Tab>
          );
        })}
        <div className="absolute bg-iron-50 bottom-0 h-[1px] w-full z-0"></div>
      </Tab.List>
      <Tab.Panels className="pt-2 xs:pt-4">
        {items.map(({ children }, index) => {
          return <Tab.Panel key={index}>{children}</Tab.Panel>;
        })}
      </Tab.Panels>
    </Tab.Group>
  );
};

Tabs.displayName = "Tabs";

export { Tabs };
