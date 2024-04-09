import { FormStepLayout } from "@/layouts/FormStepLayout";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { FormState, useForm } from "react-hook-form";
import { ProfileSchema } from "@/lib/schema/schema";
import { InferType } from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { Profile, getAuthToken, getProfile } from "@/lib/client/localStorage";
import { handleNickName } from "@/lib/shared/utils";
import router from "next/router";
import { toast } from "sonner";
import { useStateMachine } from "little-state-machine";
import updateStateFromAction from "@/lib/shared/updateAction";
import { classed } from "@tw-classed/react";

export type ProfileFormProps = InferType<typeof ProfileSchema>;

const Title = classed.h3("block font-sans text-iron-950", {
  variants: {
    size: {
      small: "text-base leading-1 font-semibold",
      medium: "text-[21px] leading-5 font-medium",
    },
  },
  defaultVariants: {
    size: "small",
  },
});

const Description = classed.span("text-sm text-iron-600 leading-5");

type ProfileProps = {
  onHandleSignout: () => void;
  onHandleSaveEdit?: (
    formValues: ProfileFormProps,
    formState: FormState<ProfileFormProps>
  ) => void;
  previousProfile: Profile | undefined;
  setPreviousProfile: (profile: Profile | undefined) => void;
  loading?: boolean;
};

// Default values for the form
export const DEFAULT_PROFILE_VALUES: ProfileFormProps = {
  displayName: "",
  bio: "",
  twitterUsername: "",
  telegramUsername: "",
};

const ProfileForm = ({
  onHandleSignout,
  onHandleSaveEdit,
  previousProfile,
  setPreviousProfile,
  loading = false,
}: ProfileProps) => {
  const { actions, getState } = useStateMachine({ updateStateFromAction });

  const updateProfileState = (values: ProfileFormProps) => {
    actions.updateStateFromAction({
      profile: {
        ...getState().profile,
        ...values,
      },
    });
  };

  const {
    register,
    setValue,
    reset,
    handleSubmit,
    clearErrors,
    formState,
    trigger,
  } = useForm<ProfileFormProps>({
    defaultValues: async () => {
      const authToken = getAuthToken();
      const profile = getProfile();

      if (!authToken || authToken.expiresAt < new Date() || !profile) {
        onHandleSignout();
        toast.error("You must be logged in to view this page");
        router.push("/login");
        return DEFAULT_PROFILE_VALUES; // return default values
      }

      const defaultFormValue = {
        displayName: profile?.displayName ?? previousProfile?.displayName,
        twitterUsername:
          handleNickName(profile?.twitterUsername) ??
          handleNickName(previousProfile?.twitterUsername),
        telegramUsername:
          handleNickName(profile?.telegramUsername) ??
          handleNickName(previousProfile?.telegramUsername),
        bio: profile?.bio ?? previousProfile?.bio,
      };

      // update the profile state
      updateProfileState({ ...defaultFormValue });

      // set the previous profile
      setPreviousProfile({ ...profile, ...defaultFormValue });

      return defaultFormValue;
    },
    resolver: yupResolver(ProfileSchema),
  });

  const { errors } = formState;

  // make sure the username is always prefixed with @
  const handleUsername = (
    filed: keyof ProfileFormProps,
    username: string | undefined
  ) => {
    if (!username) return "";
    if (!username.match(/^@/)) {
      username = "@" + username;
    }
    return setValue(filed, username, {
      shouldDirty: true,
    });
  };

  const updateProfile = async (profile: ProfileFormProps) => {
    await onHandleSaveEdit?.(profile, formState);
    reset({
      ...profile,
      ...formState,
    });
  };

  return (
    <FormStepLayout
      onSubmit={handleSubmit(updateProfile)}
      actions={
        <div className="flex flex-col gap-2">
          <Button
            disabled={!formState.isDirty || loading}
            onClick={async () => {
              const isValid = await trigger();
              if (isValid) {
                handleSubmit(updateProfile)();
              }
            }}
            loading={loading}
          >
            Save Changes
          </Button>
          <Button type="button" onClick={onHandleSignout}>
            Logout
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-12">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1 ">
            <Title>Your profile</Title>
            <Description>
              This will be visible to anyone you interact with
            </Description>
          </div>
          <Input
            label="Display name"
            disabled={true}
            error={errors.displayName?.message}
            {...register("displayName")}
          />
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1 ">
            <Title>Social settings</Title>
            <Description>
              Updates are not shared with previous connections
            </Description>
          </div>
          <div className="flex flex-col gap-6">
            <Input
              label="Twitter"
              error={errors.twitterUsername?.message}
              {...register("twitterUsername", {
                onChange: (e) => {
                  const value = e.target.value;
                  handleUsername("twitterUsername", value);
                },
              })}
            />
            <Input
              label="Telegram"
              error={errors.telegramUsername?.message}
              {...register("telegramUsername", {
                onChange: (e) => {
                  const value = e.target.value;
                  handleUsername("telegramUsername", value);
                },
              })}
            />
            <Input
              label="Bio"
              error={errors.bio?.message}
              {...register("bio")}
            />
          </div>
        </div>
      </div>
    </FormStepLayout>
  );
};

ProfileForm.displayName = "ProfileForm";

export { ProfileForm };
