export const NoResultContent = ({ children }: any) => {
  return (
    <div className="flex justify-center items-center h-[30vh]">
      <span className="text-iron-600 font-bold text-center">
        {children || "No result"}
      </span>
    </div>
  );
};
