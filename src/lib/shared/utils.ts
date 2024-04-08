import dayjs from "dayjs";

// This function check if nickname starts with @, if not, it adds it
export const handleNickName = (nickname?: string): string => {
  if (!nickname) return "";
  if (!nickname.match(/^@/)) {
    nickname = "@" + nickname;
  }
  return nickname;
};

export const handleNicknameChange = (
  event: React.ChangeEvent<HTMLInputElement>
): string => {
  let value = event.target.value;
  return handleNickName(value);
};

export const labelStartWith = (value?: string, startWith?: string): string => {
  if (!value) return "";
  return value.startsWith(startWith ?? "") ? value : `${startWith}${value}`;
};

export const removeLabelStartWith = (
  value?: string,
  startWith?: string
): string => {
  if (!value) return "";
  if (!startWith) return value;
  return value.startsWith(startWith ?? "")
    ? value.slice(startWith.length)
    : value;
};

export const formatDate = (date: string, formatReplace?: string): string => {
  const isToday = dayjs().isSame(date, "day");
  const dateFormat = formatReplace
    ? formatReplace
    : isToday
    ? "hh:mm"
    : "MMM DD, hh:mm";

  const formattedDate = dayjs(date).format(dateFormat);

  return isToday ? `Today, ${formattedDate}` : formattedDate;
};

export const filterArrayByValue = <T>(
  items: T[],
  key?: keyof T,
  value?: unknown
) => {
  return items.filter((item: T) => {
    if (key && value) {
      const keyofItem = key?.toString().toLowerCase() as keyof T;
      return item?.[keyofItem] === value;
    }
    return true;
  });
};

export function loadScript(url: string) {
  return new Promise((resolve: any, reject: any) => {
    let script: any = document.createElement("script");
    script.type = "text/javascript";
    script.onload = function () {
      resolve();
    };
    script.src = url;
    document.getElementsByTagName("head")[0].appendChild(script);
  });
}

export const displayNameRegex = /^[a-zA-Z0-9]{1,20}$/;

export const twitterUsernameRegex = /^@[a-zA-Z0-9_]{1,15}$/;

export const telegramUsernameRegex = /^@[a-zA-Z0-9_]{5,32}$/;

export const farcasterUsernameRegex = /^@[a-zA-Z0-9_.]{1,20}$/;
