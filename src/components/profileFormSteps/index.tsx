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
import { Radio } from "../Radio";
import { useStateMachine } from "little-state-machine";
import updateStateFromAction from "@/lib/shared/updateAction";
import { ClaveInfo, getUserClaveInfo } from "@/lib/client/clave";
import { useEffect, useState } from "react";

export type ProfileFormProps = InferType<typeof ProfileSchema>;

type ProfileProps = {
  onHandleSignout: () => void;
  onHandleEdit: () => void;
  isReadOnly: boolean; // form is read only
  onCancelEdit?: () => void;
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
  email: "",
  bio: "",
  twitterUsername: "",
  telegramUsername: "",
  farcasterUsername: "",
  wantsServerCustody: false,
  allowsAnalytics: false,
};

const ProfileForm = ({
  isReadOnly = true,
  onHandleSignout,
  onCancelEdit,
  onHandleEdit,
  onHandleSaveEdit,
  previousProfile,
  setPreviousProfile,
  loading = false,
}: ProfileProps) => {
  const { actions, getState } = useStateMachine({ updateStateFromAction });
  const [claveInfo, setClaveInfo] = useState<ClaveInfo>();

  useEffect(() => {
    const fetchClaveInfo = async () => {
      try {
        const claveInfo = await getUserClaveInfo();
        setClaveInfo(claveInfo);
      } catch (error) {
        toast.error("Failed to fetch wallet info");
        console.error("Error fetching clave info", error);
      }
    };

    fetchClaveInfo();
  }, []);

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
    watch,
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
        email: profile?.email ?? previousProfile?.email,
        wantsServerCustody:
          profile?.wantsServerCustody ?? previousProfile?.wantsServerCustody,
        allowsAnalytics:
          profile?.allowsAnalytics ?? previousProfile?.allowsAnalytics,
        twitterUsername:
          handleNickName(profile?.twitterUsername) ??
          handleNickName(previousProfile?.twitterUsername),
        telegramUsername:
          handleNickName(profile?.telegramUsername) ??
          handleNickName(previousProfile?.telegramUsername),
        farcasterUsername:
          handleNickName(profile?.farcasterUsername) ??
          handleNickName(previousProfile?.farcasterUsername),
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
  const wantsServerCustody = watch("wantsServerCustody", false);

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

  const handleCancelEdit = () => {
    if (!previousProfile) {
      console.error(
        "Could not connect to profile. Please refresh and try again."
      );
      return;
    }

    // reset the form to the previous profile state
    reset({
      ...previousProfile,
      // make sure the username is always prefixed with @
      telegramUsername: handleNickName(previousProfile.telegramUsername),
      twitterUsername: handleNickName(previousProfile.twitterUsername),
      farcasterUsername: handleNickName(previousProfile.farcasterUsername),
    });
    clearErrors(); // clear any errors
    onCancelEdit?.();
  };

  const updateProfile = async (profile: ProfileFormProps) => {
    onHandleSaveEdit?.(profile, formState);
  };

  return (
    <FormStepLayout
      onSubmit={handleSubmit(updateProfile)}
      actions={
        isReadOnly ? (
          <div className="flex flex-col gap-2">
            <Button type="button" onClick={onHandleEdit}>
              Edit
            </Button>
            <Button type="button" onClick={onHandleSignout}>
              Logout
            </Button>
          </div>
        ) : (
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
              Save
            </Button>
            <Button onClick={handleCancelEdit} disabled={loading}>
              Back
            </Button>
          </div>
        )
      }
    >
      <div className="flex flex-col gap-7">
        <Input
          label="Display name"
          disabled={isReadOnly}
          error={errors.displayName?.message}
          {...register("displayName")}
        />
        <Input
          label="Email"
          disabled={true} // prevent form from being edited
          {...register("email")}
        />
      </div>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col">
          <span className="text-gray-12 text-sm font-light">
            Shareable socials
          </span>
          <span className="text-gray-11 text-xs font-light">
            {`Taps are one way: you choose which socials to share when you tap someone and they see nothing when they tap you.`}
          </span>
        </div>
        <div className="flex flex-col gap-6">
          <Input
            label="Twitter"
            disabled={isReadOnly}
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
            disabled={isReadOnly}
            error={errors.telegramUsername?.message}
            {...register("telegramUsername", {
              onChange: (e) => {
                const value = e.target.value;
                handleUsername("telegramUsername", value);
              },
            })}
          />
          <Input
            label="Farcaster"
            error={errors.farcasterUsername?.message}
            disabled={isReadOnly}
            {...register("farcasterUsername", {
              onChange: (e) => {
                const value = e.target.value;
                handleUsername("farcasterUsername", value);
              },
            })}
          />
          <Input
            label="Bio"
            error={errors.bio?.message}
            disabled={isReadOnly}
            {...register("bio")}
          />
        </div>
      </div>
      {claveInfo && (
        <div className="flex flex-col gap-2">
          <span className="text-gray-12 text-sm font-light">
            Clave wallet setup
          </span>
          {claveInfo.claveWalletAddress ? (
            <span className="text-gray-12 text-sm font-light">{`Wallet Address: ${claveInfo.claveWalletAddress}`}</span>
          ) : (
            <>
              <Button
                type="button"
                onClick={() =>
                  window.open("https://www.getclave.io/download", "_blank")
                }
                className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
              >
                Download the app
              </Button>
              <Button
                type="button"
                onClick={() => window.open(claveInfo.claveInviteLink, "_blank")}
                className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
              >
                Get invite link
              </Button>
            </>
          )}
        </div>
      )}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <span className="text-gray-12 text-sm font-light">
            Privacy settings
          </span>
          <Radio
            id="selfCustody"
            name="custody"
            value="self"
            label="Self custody"
            description="Your ETHDenver interaction data is private to you, encrypted by a master password set on the next page. ZK proofs are used to prove quest completion."
            checked={!wantsServerCustody}
            disabled={isReadOnly}
            onChange={() =>
              setValue("wantsServerCustody", false, {
                shouldDirty: true,
              })
            }
          />
          <Radio
            id="serverCustody"
            type="radio"
            name="custody"
            value="server"
            label="Server custody"
            description="Your ETHDenver interaction data can be read by the app server, but login just requires an email code."
            checked={wantsServerCustody}
            disabled={isReadOnly}
            onChange={() =>
              setValue("wantsServerCustody", true, {
                shouldDirty: true,
              })
            }
          />
        </div>
      </div>
    </FormStepLayout>
  );
};

ProfileForm.displayName = "ProfileForm";

export { ProfileForm };
