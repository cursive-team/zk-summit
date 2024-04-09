import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { FormStepLayout } from "@/layouts/FormStepLayout";
import { LoginSchema } from "@/lib/schema/schema";
import updateStateFromAction from "@/lib/shared/updateAction";
import { yupResolver } from "@hookform/resolvers/yup";
import { useMutation } from "@tanstack/react-query";
import { useStateMachine } from "little-state-machine";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { AppBackHeader } from "@/components/AppHeader";
import { useCompleteLogin } from "@/hooks/useCompleteLogin";
import { encryptedBackupDataSchema } from "@/pages/api/backup";
import { LoginFormStepProps } from ".";
import { APP_CONFIG } from "@/shared/constants";
import { InferType } from "yup";

const LoginCodeSchema = LoginSchema.pick(["code"]);
type LoginFormProps = InferType<typeof LoginCodeSchema>;

const LoginStepCode = ({
  onSuccess,
  onBack,
  onSuccessfulLogin,
}: LoginFormStepProps) => {
  const { actions, getState } = useStateMachine({ updateStateFromAction });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormProps>({
    resolver: yupResolver(LoginCodeSchema),
    defaultValues: {
      code: getState()?.login?.code,
    },
  });

  const { completeLogin } = useCompleteLogin({
    onSuccessfulLogin,
  });

  // let's trim and lowercase email, with iPhone sometime it start with a capital letter or add a space at the end
  const email = getState()?.login?.email?.trim().toLowerCase();

  const verifyCodeMutation = useMutation({
    mutationKey: ["verifyCode"],
    mutationFn: async ({ code }: LoginFormProps) => {
      const response = await fetch("/api/login/verify_code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, code }),
      });
      const data = await response.json();

      if (!response.ok || !data.backup) {
        return Promise.reject({ error: "Error logging in. Please try again." });
      }

      // Validate auth token is correctly formed
      const authTokenInvalid =
        !data.authToken ||
        !data.authToken.value ||
        typeof data.authToken.value !== "string" ||
        !data.authToken.expiresAt ||
        typeof data.authToken.expiresAt !== "string";

      if (authTokenInvalid) {
        return Promise.reject({ error: "Error logging in. Please try again." });
      }

      return Promise.resolve(data);
    },
  });

  const onSubmit = async (formValues: LoginFormProps) => {
    const code = formValues.code;

    await verifyCodeMutation.mutateAsync(formValues, {
      onSuccess: async (data: any) => {
        // Save auth token
        const { value, expiresAt } = data.authToken;
        const authToken = { value, expiresAt: new Date(expiresAt) };

        // Save auth token state for case where user needs to input password
        actions.updateStateFromAction({
          login: {
            ...getState().login,
            authToken,
          },
        });

        // Password hint is provided if user chooses self custody
        if (data.password) {
          const { encryptedData, authenticationTag, iv } =
            encryptedBackupDataSchema.validateSync(data.backup);

          // User must confirm password to decrypt data
          actions.updateStateFromAction({
            login: {
              ...getState().login,
              code,
              encryptedData,
              authenticationTag,
              iv,
              passwordSalt: data.password.salt,
              passwordHash: data.password.hash,
            },
          });

          onSuccess?.(); // redirect to password page
        } else {
          if (
            !data.backup ||
            !data.backup.decryptedData ||
            typeof data.backup.decryptedData !== "string"
          ) {
            console.error("Invalid backup received");
            toast.error(
              `Invalid backup received. Contact ${APP_CONFIG.SUPPORT_EMAIL}`
            );
            return;
          }

          const backup = data.backup.decryptedData;
          await completeLogin({
            backup,
            token: authToken,
          });
        }
      },
      onError: (error: any) => {
        toast.error(
          error?.error || "An unexpected error occurred. Please try again."
        );
      },
    });
  };

  return (
    <>
      <AppBackHeader onBackClick={onBack} />
      <FormStepLayout
        title="Login"
        description="Welcome to ZKSummit"
        onSubmit={handleSubmit(onSubmit)}
        className="!pt-0"
      >
        <Input
          type="text"
          id="code"
          label="Code"
          placeholder="XXX-XXX"
          error={errors.code?.message}
          {...register("code")}
        />
        <Button type="submit" loading={verifyCodeMutation.isPending}>
          Login
        </Button>
      </FormStepLayout>
    </>
  );
};

LoginStepCode.displayName = "LoginStepCode";
export { LoginStepCode };
