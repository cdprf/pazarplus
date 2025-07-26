import React from "react";
import { useTranslation } from "../i18n/hooks/useTranslation";
import {
  CodeBracketIcon,
  Cog6ToothIcon,
  BugAntIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";
import DeveloperSettings from "../components/settings/DeveloperSettings";
import PerformanceDashboard from "../components/developer/PerformanceDashboard";

const DeveloperPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Only show in development or if debug mode is enabled
  if (process.env.NODE_ENV !== "development") {
    return (
      <div className="page-container" role="main" aria-label="Developer Tools">
        <div className="bg-white rounded-lg shadow p-6 text-center dark:bg-gray-800">
          <BugAntIcon className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {t("developer.title", "Geliştirici Araçları")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {t(
              "developer.notAvailable",
              "Geliştirici araçları sadece geliştirme modunda kullanılabilir."
            )}
          </p>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            {t("common.goBack", {}, "Geri Dön")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" role="main" aria-label="Developer Tools">
      {/* Enhanced Header with Back Button */}
      <div className="page-header">
        <div className="flex-1">
          <div className="flex items-center mb-4">
            <button
              onClick={() => navigate(-1)}
              className="page-header-icon p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-gray-800"
              aria-label={t("common.goBack", {}, "Geri dön")}
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div className="stat-icon stat-icon-primary mr-4 flex-shrink-0">
              <CodeBracketIcon className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="page-title" id="developer-title">
                {t("developer.title", "Geliştirici Araçları")}
              </h1>
              <p className="page-subtitle mt-1">
                {t(
                  "developer.subtitle",
                  "Hata ayıklama araçlarını ve geliştirme ayarlarını yapılandırın"
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Developer Settings */}
      <div className="bg-white rounded-lg shadow dark:bg-gray-800">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <Cog6ToothIcon className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-2" />
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              {t("developer.configuration", {}, "Geliştirme Yapılandırması")}
            </h2>
          </div>
        </div>
        <div className="p-6">
          <DeveloperSettings />
        </div>
      </div>

      {/* Additional Development Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 dark:bg-blue-900/20 dark:border-blue-800">
        <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-3">
          {t("developer.information", {}, "Geliştirme Bilgileri")}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <strong className="text-blue-800 dark:text-blue-200">
              {t("developer.environment", {}, "Ortam")}:
            </strong>
            <span className="ml-2 text-blue-700 dark:text-blue-300">
              {process.env.NODE_ENV}
            </span>
          </div>
          <div>
            <strong className="text-blue-800 dark:text-blue-200">
              {t("developer.reactVersion", {}, "React Sürümü")}:
            </strong>
            <span className="ml-2 text-blue-700 dark:text-blue-300">
              {React.version}
            </span>
          </div>
          <div>
            <strong className="text-blue-800 dark:text-blue-200">
              {t("developer.userAgent", {}, "Kullanıcı Aracısı")}:
            </strong>
            <span className="ml-2 text-blue-700 dark:text-blue-300 break-all">
              {navigator.userAgent.substring(0, 80)}...
            </span>
          </div>
          <div>
            <strong className="text-blue-800 dark:text-blue-200">
              {t("developer.localStorageAvailable", {}, "LocalStorage Mevcut")}:
            </strong>
            <span className="ml-2 text-blue-700 dark:text-blue-300">
              {typeof Storage !== "undefined"
                ? t("common.yes", {}, "Evet")
                : t("common.no", {}, "Hayır")}
            </span>
          </div>
        </div>
      </div>

      {/* Performance Dashboard - only in development */}
      {process.env.NODE_ENV === "development" && <PerformanceDashboard />}
    </div>
  );
};

export default DeveloperPage;
