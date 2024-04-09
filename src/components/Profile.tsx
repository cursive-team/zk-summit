import { FormStepLayout } from "@/layouts/FormStepLayout";
import { Button } from "./Button";
import { Input } from "./Input";
import { ReactNode, useState } from "react";
import {
  Profile as ProfileType,
  getAuthToken,
  saveProfile,
} from "@/lib/client/localStorage";
import { useRouter } from "next/router";
import { toast } from "sonner";
import { hashPassword } from "@/lib/client/utils";
import { ProfileForm, ProfileFormProps } from "./profileFormSteps";
import { useMutation } from "@tanstack/react-query";
import { useStateMachine } from "little-state-machine";
import updateStateFromAction from "@/lib/shared/updateAction";
import { ProfileDisplayState } from "@/types";
import { logClientEvent } from "@/lib/client/metrics";

interface ProfileProps {
  handleSignout: () => void;
}

const Profile = ({ handleSignout }: ProfileProps) => {
  const { actions, getState } = useStateMachine({ updateStateFromAction });

  const displayState = getState().profileView ?? ProfileDisplayState.EDIT;

  const router = useRouter();

  const [previousProfile, setPreviousProfile] = useState<ProfileType>();
  const [inputPassword, setInputPassword] = useState<string>();
  const [password, setPassword] = useState<string>();
  const [confirmPassword, setConfirmPassword] = useState<string>();
  const [cachedPasswordSalt, setCachedPasswordSalt] = useState<string>();
  const [cachedPasswordHash, setCachedPasswordHash] = useState<string>();
  const [loading, setLoading] = useState<boolean>(false);

  const clearFormValues = () => {
    // clear input password
    setInputPassword("");
    setPassword("");
    setConfirmPassword("");
  };

  const updateProfile = async () => {
    logClientEvent("profileUpdate", {});

    const { displayName, twitterUsername, telegramUsername, bio } =
      getState().profile;

    setLoading(true);

    const authToken = getAuthToken();
    if (!authToken || authToken.expiresAt < new Date()) {
      handleSignout();
      toast.error("You must be logged in to update your profile");
      router.push("/login");
      return;
    }

    if (!previousProfile) {
      console.error(
        "Could not connect to profile. Please refresh and try again."
      );
      return;
    }

    const response = await fetch("/api/user/update_profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        authToken: authToken.value,
        twitterUsername,
        telegramUsername,
        bio,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`Error updating profile: ${data.error}`);
      toast.error("Error updating profile! Please try again.");
      setLoading(false); // reset login
      return;
    }

    const profile = {
      displayName,
      encryptionPublicKey: previousProfile.encryptionPublicKey,
      signaturePublicKey: previousProfile.signaturePublicKey,
      twitterUsername,
      telegramUsername,
      bio,
    };
    saveProfile(profile);

    clearFormValues();

    setPreviousProfile(profile);
    setLoading(false);
    toast.success("Profile updated successfully!");
  };

  const handleSaveEdit = async (formValues: ProfileFormProps) => {
    actions.updateStateFromAction({
      profile: {
        ...getState().profile,
        ...formValues,
      },
    });

    if (!previousProfile) {
      console.error(
        "Could not connect to profile. Please refresh and try again."
      );
      return;
    }

    await updateProfile();
  };

  const handleSubmitInputPassword = async (event: React.FormEvent) => {
    event.preventDefault();

    const authToken = getAuthToken();
    if (!authToken || authToken.expiresAt < new Date()) {
      handleSignout();
      toast.error("You must be logged in to update your profile");
      router.push("/login");
      return;
    }

    if (!inputPassword) {
      toast.error("Please enter your master password");
      return;
    }

    if (!cachedPasswordSalt || !cachedPasswordHash) {
      const response = await fetch(
        `/api/user/get_password_hash?token=${authToken.value}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        console.error("Error getting password hash");
        toast.error("Error getting password hash");
        return;
      }

      const { passwordSalt, passwordHash } = await response.json();
      setCachedPasswordSalt(passwordSalt);
      setCachedPasswordHash(passwordHash);

      const derivedPasswordHash = await hashPassword(
        inputPassword,
        passwordSalt
      );
      if (derivedPasswordHash !== passwordHash) {
        toast.error("Incorrect password");
        return;
      }
    } else {
      const derivedPasswordHash = await hashPassword(
        inputPassword,
        cachedPasswordSalt
      );
      if (derivedPasswordHash !== cachedPasswordHash) {
        toast.error("Incorrect password");
        return;
      }
    }

    await updateProfile();
  };

  const handleSubmitPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!password || password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (!previousProfile) {
      console.error(
        "Could not connect to profile. Please refresh and try again."
      );
      return;
    }

    await updateProfile();
  };

  const handleCancelPassword = (event: React.FormEvent) => {
    event.preventDefault();
    setPassword(undefined);
    setConfirmPassword(undefined);
  };

  const handleInputPasswordChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setInputPassword(event.target.value);
  };

  const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value);
  };

  const handleConfirmPasswordChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setConfirmPassword(event.target.value);
  };

  const handleSaveEditMutation = useMutation({
    mutationKey: ["saveEdit"],
    mutationFn: (formValues: ProfileFormProps) => handleSaveEdit(formValues),
  });

  const ViewByState: Partial<Record<ProfileDisplayState, ReactNode>> = {
    [ProfileDisplayState.EDIT]: (
      <ProfileForm
        previousProfile={previousProfile}
        setPreviousProfile={setPreviousProfile}
        onHandleSignout={() => {
          handleSignout();
        }}
        onHandleSaveEdit={(formValues: ProfileFormProps) => {
          handleSaveEditMutation.mutateAsync(formValues);
        }}
        loading={handleSaveEditMutation.isPending}
      />
    ),
    [ProfileDisplayState.INPUT_PASSWORD]: (
      <FormStepLayout
        title={
          <div className="flex flex-col gap-2 mb-2">
            <span>Enter password</span>
          </div>
        }
        description="Enter your master password to save your new profile"
        onSubmit={handleSubmitInputPassword}
      >
        <Input
          type="password"
          label="Password"
          value={inputPassword}
          onChange={handleInputPasswordChange}
          required
        />
        <Button loading={loading} type="submit">
          Confirm
        </Button>
      </FormStepLayout>
    ),
    [ProfileDisplayState.CHOOSE_PASSWORD]: (
      <FormStepLayout
        title={
          <div className="flex flex-col gap-2 mb-2">
            <span>Choose a master password</span>
          </div>
        }
        actions={
          <div className="flex flex-col gap-2">
            <Button loading={loading} onClick={handleSubmitPassword}>
              Update Profile
            </Button>
            <Button onClick={handleCancelPassword} disabled={loading}>
              Back
            </Button>
          </div>
        }
      >
        <Input
          type="password"
          name="password"
          label="Master password"
          value={password}
          onChange={handlePasswordChange}
          required
        />
        <Input
          type="password"
          name="confirmPassword"
          label="Confirm master password"
          value={confirmPassword}
          onChange={handleConfirmPasswordChange}
          required
        />
        <span className="text-gray-11 text-sm">
          This master password is used to encrypt a backup of your interaction
          data on our server. You are responsible for saving this password
          and/or manually backing up your data from the app.
        </span>
      </FormStepLayout>
    ),
  };

  return <>{ViewByState[displayState]}</>;
};

export default Profile;
