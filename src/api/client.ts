import axios from "@/utils/axios";

export type ApiResponse<T = unknown> = {
  data: T;
  message?: string;
};

export { axios as http };
