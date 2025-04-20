import axios, {AxiosError, AxiosRequestConfig, AxiosResponse} from "axios";
import {toast} from "react-toastify";
import Config from "@/config";

export interface IDataError {
  errorCode: string;
  errorMessage?: string;
}

export interface IMetadata {
  time?: string;
  totalPage: number;
  totalItems: number;
  currentPage: number;
  pageSize?: number;
}

export interface IDataWithMeta<T> {
  meta: IMetadata;
  data: T;
}

export interface IResponseDTO<T> {
  success: boolean;
  errorCode?: string;
  message?: string;
  meta?: IMetadata;
  data?: T;
  statusCode?: number;
}

interface IResponseWithMetadataDTO<T> {
  success: boolean;
  errorCode: string;
  message?: string;
  metaData: IMetadata;
  data?: T;
}

interface IFetcherOptions {
  token?: string;
  withToken?: boolean;
  withMetadata?: boolean;
  displayError?: boolean;
  logRequest?: boolean;
  isFormData?: boolean;
}

function handleLogout(content: string, isRequiredLogOut: boolean): void {
  if (!isRequiredLogOut) {
    toast.warn(content);
  } else {
    window.location.assign(Config.PATHNAME.HOME);
    toast.error(content);
  }
}

function displayError(dataError: IDataError): void {
  const errorMessage = dataError.errorMessage ?? "Có lỗi xảy ra";
  toast.error(errorMessage);
}

function getAuthorization(defaultOptions: IFetcherOptions) {
  if (defaultOptions.token) {
    return `Bearer ${defaultOptions.token}`;
  }

  return undefined;
}

function createApiClient(config: AxiosRequestConfig, options: IFetcherOptions) {
  const defaultOptions: IFetcherOptions = {
    ...config,
    withToken: Config.NETWORK_CONFIG.USE_TOKEN,
    withMetadata: Config.NETWORK_CONFIG.WITH_METADATA,
    displayError: Config.NETWORK_CONFIG.DISPLAY_ERROR,
    ...options,
  };

  const apiClient = axios.create({
    headers: {
      "Content-Type": options.isFormData
        ? "multipart/form-data"
        : "application/json",
      "Authorization": getAuthorization(defaultOptions),
    },
    baseURL: Config.NETWORK_CONFIG.API_BASE_URL,
    timeout: Config.NETWORK_CONFIG.TIMEOUT,
  });

  return {apiClient, defaultOptions};
}

function returnResponseData<T>(
  defaultOptions: IFetcherOptions,
  response: AxiosResponse<IResponseDTO<T>, IDataError>,
  resolve: (value: T | PromiseLike<T>) => void,
  reject: (reason?: IDataError) => void,
) {
  if (response.data?.success) {
    if (response.data.data === undefined) {
      const dataEmpty: IDataError = {
        errorCode: "ERROR???",
        errorMessage: "Dữ liệu trống",
      };
      if (defaultOptions.displayError) {
        displayError(dataEmpty);
      }
      reject(dataEmpty);
      return true;
    }
    resolve(response.data.data);
    return true;
  }
  return false;
}

function returnResponseDataWithMetaData<T>(
  defaultOptions: IFetcherOptions,
  response: AxiosResponse<IResponseWithMetadataDTO<T>, IDataError>,
  resolve: (value: IDataWithMeta<T> | PromiseLike<IDataWithMeta<T>>) => void,
  reject: (reason?: IDataError) => void,
) {
  if (response.data.success) {
    if (response.data.data === undefined) {
      const dataEmpty: IDataError = {
        errorCode: "ERROR???",
        errorMessage: "Dữ liệu trống",
      };
      if (defaultOptions.displayError) {
        displayError(dataEmpty);
      }
      reject(dataEmpty);
      return true;
    }
    resolve({
      data: response.data.data,
      meta: response.data.metaData,
    });
    return true;
  }
  return false;
}

async function processOtherCase<T, E>(
  config: AxiosRequestConfig,
  options: IFetcherOptions,
  defaultOptions: IFetcherOptions,
  response:
    | AxiosResponse<IResponseDTO<T>, IDataError>
    | AxiosResponse<IResponseWithMetadataDTO<T>, IDataError>,
  resolve: (value: E) => void,
  reject: (reason?: IDataError) => void,
) {
  const dataError: IDataError = {
    errorCode: response.data.errorCode || "",
    errorMessage: response.data.message,
  };

  if (dataError?.errorCode === "AUTH000220") {
    handleLogout("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!", true);
    reject(dataError);
    return;
  }

  if (dataError?.errorCode === "JWT000201") {
    handleLogout("Vui lòng đăng nhập để sử dụng chức năng này!", false);
    reject(dataError);
    return;
  }

  if (defaultOptions.displayError) {
    displayError(dataError);
  }
  reject(dataError);
}

function returnErrorData(
  defaultOptions: IFetcherOptions,
  error: Error | AxiosError,
  reject: (reason?: IDataError) => void,
) {
  if (axios.isAxiosError(error)) {
    const somethingsWrong: IDataError = {
      errorCode: "ERROR???",
      errorMessage: "Có lỗi xảy ra",
    };

    let dataError: IDataError = somethingsWrong;
    if (error?.response?.data) {
      dataError = {
        errorCode: error?.response?.data.errorCode,
        errorMessage: error?.response?.data.message,
      };
    }

    if (dataError?.errorCode === "AUTH3001.NotAuthenticated") {
      handleLogout("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!", true);
    } else if (defaultOptions.displayError) {
      displayError(dataError);
    }

    return reject(dataError);
  }

  toast.error("Có lỗi xảy ra. Vui lòng thử lại");

  return reject({
    errorCode: "NATIVE_ERROR",
    errorMessage: "Có lỗi xảy ra",
  });
}

export async function fetcher<T>(
  config: AxiosRequestConfig,
  options: IFetcherOptions = {},
): Promise<T> {
  const {apiClient, defaultOptions} = createApiClient(config, options);

  return new Promise<T>((resolve, reject) => {
    apiClient
      .request<T, AxiosResponse<IResponseDTO<T>>>(config)
      .then(async (response) => {
        const newResponse = {
          ...response,
          data: {
            ...response?.data,
            errorCode: response?.data?.success
              ? ""
              : response?.data?.statusCode?.toString(),
            errorMessage: response?.data?.success
              ? ""
              : response?.data?.message,
          },
        };
        if (!returnResponseData(defaultOptions, newResponse, resolve, reject)) {
          await processOtherCase(
            config,
            options,
            defaultOptions,
            newResponse,
            resolve,
            reject,
          );
        }
      })
      .catch((error: Error | AxiosError) => {
        returnErrorData(defaultOptions, error, reject);
      });
  });
}

export async function fetcherWithMetadata<T>(
  config: AxiosRequestConfig,
  options: IFetcherOptions = {},
): Promise<IDataWithMeta<T>> {
  const {apiClient, defaultOptions} = createApiClient(config, options);

  return new Promise<IDataWithMeta<T>>((resolve, reject) => {
    apiClient
      .request<T, AxiosResponse<IResponseWithMetadataDTO<T>>>(config)
      .then(async (response) => {
        if (
          !returnResponseDataWithMetaData(
            defaultOptions,
            response,
            resolve,
            reject,
          )
        ) {
          await processOtherCase(
            config,
            options,
            defaultOptions,
            response,
            resolve,
            reject,
          );
        }
      })
      .catch((error: Error | AxiosError) => {
        returnErrorData(defaultOptions, error, reject);
      });
  });
}
