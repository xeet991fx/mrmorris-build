import axiosInstance from "../axios";

export interface WaitlistData {
  email: string;
  companyName?: string;
  role?: string;
  teamSize?: "1-5" | "6-20" | "21-50" | "51-200" | "200+";
  source?: string;
}

export interface WaitlistResponse {
  message: string;
  data: {
    email: string;
    createdAt: string;
  };
}

export interface WaitlistStatusResponse {
  onWaitlist: boolean;
  joinedAt?: string;
}

export interface ErrorResponse {
  error: string;
  details?: any;
}

export const joinWaitlist = async (data: WaitlistData): Promise<WaitlistResponse> => {
  const response = await axiosInstance.post<WaitlistResponse>("/waitlist", data);
  return response.data;
};

export const checkWaitlistStatus = async (email: string): Promise<WaitlistStatusResponse> => {
  const response = await axiosInstance.get<WaitlistStatusResponse>("/waitlist", {
    params: { email },
  });
  return response.data;
};
