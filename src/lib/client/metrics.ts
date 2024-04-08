declare var _paq: any[];

export type Interaction = {
  category: "folding";
  action: "click";
  name: string;
  value?: string;
};

export const logInteraction = async (interaction: Interaction) => {
  const event = [
    "trackEvent",
    interaction.category,
    interaction.action,
    interaction.name,
  ];
  if (interaction.value) {
    event.push(interaction.value);
  }

  try {
    _paq.push(event);
  } catch (e) {
    console.error("Failed to log interaction", e);
  }
};
