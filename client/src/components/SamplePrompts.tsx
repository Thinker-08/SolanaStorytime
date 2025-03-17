interface SamplePromptsProps {
  onPromptClick: (prompt: string) => void;
}

const samplePrompts = [
  "Create a story about dragons teaching my 7-year-old daughter Emma about Solana wallets",
  "Tell my 5-year-old son Leo a bedtime story about space explorers discovering NFTs",
  "Write a short princess story for my 8-year-old that explains blockchain in a simple way",
  "Generate a medium-length adventure story about Solana staking for my 6-year-old twins"
];

const borderColors = [
  "border-accent",
  "border-primary",
  "border-secondary",
  "border-primary"
];

const SamplePrompts = ({ onPromptClick }: SamplePromptsProps) => {
  return (
    <section className="mb-6">
      <h2 className="text-lg font-semibold mb-3 text-primary">Try asking for a story like these:</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {samplePrompts.map((prompt, index) => (
          <div
            key={index}
            className={`bg-white rounded-lg p-3 shadow-sm border-l-4 ${borderColors[index % borderColors.length]} hover:shadow-md transition-shadow cursor-pointer`}
            onClick={() => onPromptClick(prompt)}
          >
            <p className="text-sm">"{prompt}"</p>
          </div>
        ))}
      </div>
      <div className="mt-3 text-center">
        <p className="text-sm text-gray-600">
          Just tell the bot your child's name, age, and what kind of story you'd like about Solana concepts
        </p>
      </div>
    </section>
  );
};

export default SamplePrompts;
