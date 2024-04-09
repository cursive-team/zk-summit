import { LoginType, RegisterType, ProfileType } from "@/lib/schema/schema";
import { ProfileDisplayState } from "@/types";
import "little-state-machine";

/*
We use little-state-machine as a global state management library to store and share the user information across different pages and sections.
In particular, we are using it for collecting different user information for login/registration.
In this way, we can also have single file for the different steps of the login/registration process and simplify the code.
*/
declare module "little-state-machine" {
  interface GlobalState {
    login: LoginType;
    register: RegisterType;
    profile: ProfileType;
    profileView: ProfileDisplayState;
    isMenuOpen: boolean;
  }
}

declare global {
  interface Window {
    render: () => void;
    createjs: any;
    FlowerRnd: any;
    Flower: any;
    _mtm: any[];
  }
}
