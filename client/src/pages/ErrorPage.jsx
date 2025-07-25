import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "../i18n/hooks/useTranslation";
import ErrorState from "../components/common/ErrorState";

/**
 * Full-page error component for routing errors and general application errors
 */
const ErrorPage = ({
  type = "general",
  title,
  message,
  showNavigation = true,
}) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  // Extract error details from location state if available
  const errorDetails = location.state?.error;
  const errorType = location.state?.type || type;

  const handleRetry = () => {
    // If there's a previous location, go back
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  const handleHome = () => {
    navigate("/");
  };

  // Configure error based on route
  const getErrorConfig = () => {
    const path = location.pathname;

    if (path.includes("/404") || errorType === "notFound") {
      return {
        type: "notFound",
        title: title || t("errors.pageNotFound", {}, "404 - Sayfa Bulunamadı"),
        message:
          message ||
          t(
            "errors.pageNotFoundMessage",
            { path },
            `"${path}" sayfası bulunamadı.`
          ),
      };
    }

    if (path.includes("/500") || errorType === "server") {
      return {
        type: "server",
        title: title || t("errors.serverError", {}, "500 - Sunucu Hatası"),
        message:
          message ||
          t("errors.serverErrorMessage", {}, "Sunucu içi hata oluştu."),
      };
    }

    if (path.includes("/unauthorized") || errorType === "unauthorized") {
      return {
        type: "unauthorized",
        title: title || t("errors.unauthorized", {}, "403 - Yetkisiz"),
        message:
          message ||
          t(
            "errors.unauthorizedMessage",
            {},
            "Bu sayfaya erişim yetkiniz bulunmuyor."
          ),
      };
    }

    return {
      type: errorType,
      title: title || t("errors.error", {}, "Hata"),
      message:
        message ||
        t("errors.errorMessage", {}, "Bu sayfa yüklenirken bir hata oluştu."),
    };
  };

  const errorConfig = getErrorConfig();

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <ErrorState
        type={errorConfig.type}
        title={errorConfig.title}
        message={errorConfig.message}
        details={errorDetails}
        showDetailsToggle={!!errorDetails}
        showRetryButton={showNavigation}
        showHomeButton={showNavigation}
        onRetry={handleRetry}
        onHome={handleHome}
        size="large"
      />
    </div>
  );
};

export default ErrorPage;
