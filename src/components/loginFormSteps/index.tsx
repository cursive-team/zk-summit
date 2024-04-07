import { FormStepLayout } from "@/layouts/FormStepLayout";
import updateStateFromAction from "@/lib/shared/updateAction";
import { useMutation } from "@tanstack/react-query";
import { useStateMachine } from "little-state-machine";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "../Button";
import { Input } from "../Input";
import { LoginSchema } from "@/lib/schema/schema";
import { InferType } from "yup";
import { yupResolver } from "@hookform/resolvers/yup";

const LoginEmailSchema = LoginSchema.pick(["email"]);
type LoginFormProps = InferType<typeof LoginEmailSchema>;

export interface LoginFormStepProps {
  onSuccessfulLogin?: () => void;
  onSuccess?: () => void;
  onBack?: () => void;
  subtitle?: string;
}

const LoginFormStepIndex = ({ onSuccess, subtitle }: LoginFormStepProps) => {
  const { actions, getState } = useStateMachine({ updateStateFromAction });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormProps>({
    resolver: yupResolver(LoginEmailSchema),
    defaultValues: {
      email: getState()?.login?.email,
    },
  });

  const loginMutation = useMutation({
    mutationKey: ["login"],
    mutationFn: async ({ email }: LoginFormProps) => {
      actions.updateStateFromAction({ login: { email } });

      // let's trim and lowercase email, with iPhone sometime it start with a capital letter or add a space at the end
      const emailClean = email.trim().toLowerCase();

      const response = await fetch("/api/login/get_code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: emailClean }),
      });

      if (!response.ok) {
        const err: any = await response
          .json()
          .then((text) => text?.error || text);

        return Promise.reject(
          err || "Error requesting code. Please try again."
        );
      }

      return Promise.resolve();
    },
  });

  const onSubmit = async ({ email }: LoginFormProps) => {
    await loginMutation.mutateAsync(
      { email },
      {
        onSuccess: () => {
          onSuccess?.();
        },
        onError: (err: any) => {
          toast.error(
            err ||
              err?.message ||
              "An unexpected error occurred. Please try again."
          );
        },
      }
    );
  };

  return (
    <FormStepLayout
      title="Login"
      description="Welcome to ZKSummit"
      subtitle={subtitle}
      onSubmit={handleSubmit(onSubmit)}
      className="pt-4"
    >
      <Input
        type="text"
        id="email"
        label="Email"
        placeholder="example@xyz.com"
        error={errors.email?.message}
        {...register("email")}
      />
      <Button type="submit" loading={loginMutation.isPending}>
        Send Code
      </Button>
    </FormStepLayout>
  );
};

LoginFormStepIndex.displayName = "LoginFormStepIndex";
export { LoginFormStepIndex };
