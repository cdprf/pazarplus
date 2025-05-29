import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Alert } from "../ui/Alert";
import { Loader } from "../ui/Loader";
import { api } from "../../services/api";
import { useAlert } from "../../contexts/AlertContext";

const ShippingManager = () => {
  const { showAlert } = useAlert();
  const [carriers, setCarriers] = useState([]);
  const [selectedCarrier, setSelectedCarrier] = useState("");
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [trackingData, setTrackingData] = useState(null);
  const [activeTab, setActiveTab] = useState("rates");

  // Form data
  const [packageInfo, setPackageInfo] = useState({
    weight: 1000,
    dimensions: { length: 20, width: 15, height: 10 },
    declaredValue: 100,
    serviceType: "STANDARD",
  });

  const [fromAddress, setFromAddress] = useState({
    name: "Satıcı A.Ş.",
    address1: "Maslak Mahallesi Eski Büyükdere Cad. No:1",
    city: "İstanbul",
    district: "Sarıyer",
    postalCode: "34485",
    phone: "+905551234567",
    email: "info@seller.com",
  });

  const [toAddress, setToAddress] = useState({
    name: "Müşteri Adı",
    address1: "Kızılay Mahallesi Atatürk Bulvarı No:123",
    city: "Ankara",
    district: "Çankaya",
    postalCode: "06420",
    phone: "+905559876543",
    email: "customer@example.com",
  });

  const [trackingInfo, setTrackingInfo] = useState({
    trackingNumber: "",
    carrier: "",
  });

  // Load supported carriers on component mount
  useEffect(() => {
    loadCarriers();
  }, []);

  const loadCarriers = async () => {
    try {
      const response = await api.get("/api/shipping/carriers");
      if (response.data.success) {
        setCarriers(response.data.data);
      }
    } catch (error) {
      setError("Failed to load carriers: " + error.message);
    }
  };

  const compareRates = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.post("/api/shipping/rates", {
        packageInfo,
        fromAddress,
        toAddress,
        carriers: selectedCarrier ? [selectedCarrier] : null, // Let backend decide which carriers to use
      });

      if (response.data.success) {
        setRates(response.data.data.carriers || []);
      } else {
        setError(response.data.error?.message || "Failed to get rates");
      }
    } catch (error) {
      setError("Rate comparison failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const createShippingLabel = async (carrier, rate) => {
    setLoading(true);
    setError("");

    try {
      const shipmentData = {
        packageInfo: {
          ...packageInfo,
          serviceType: rate.serviceCode,
        },
        fromAddress,
        toAddress,
        orderInfo: {
          orderNumber: `ORD-${Date.now()}`,
        },
      };

      const response = await api.post("/api/shipping/labels", {
        shipmentData,
        carrier,
      });

      if (response.data.success) {
        const { trackingNumber } = response.data.data;
        showAlert(
          `Label created successfully! Tracking Number: ${trackingNumber}`,
          "success"
        );

        // Update tracking info for easy tracking
        setTrackingInfo({
          trackingNumber,
          carrier,
        });
        setActiveTab("tracking");
      } else {
        setError(response.data.error?.message || "Failed to create label");
      }
    } catch (error) {
      setError("Label creation failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const trackPackage = async () => {
    if (!trackingInfo.trackingNumber || !trackingInfo.carrier) {
      setError("Please enter tracking number and select carrier");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await api.get(
        `/api/shipping/track/${trackingInfo.carrier}/${trackingInfo.trackingNumber}`
      );

      if (response.data.success) {
        setTrackingData(response.data.data);
      } else {
        setError(response.data.error?.message || "Failed to track package");
      }
    } catch (error) {
      setError("Tracking failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const statusColors = {
      pending: "bg-yellow-100 text-yellow-800",
      picked_up: "bg-blue-100 text-blue-800",
      in_transit: "bg-purple-100 text-purple-800",
      out_for_delivery: "bg-orange-100 text-orange-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
      returned: "bg-gray-100 text-gray-800",
    };
    return statusColors[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">
          Turkish Shipping Manager
        </h1>
        <div className="flex space-x-2">
          <Button
            variant={activeTab === "rates" ? "primary" : "secondary"}
            onClick={() => setActiveTab("rates")}
          >
            Rate Comparison
          </Button>
          <Button
            variant={activeTab === "tracking" ? "primary" : "secondary"}
            onClick={() => setActiveTab("tracking")}
          >
            Package Tracking
          </Button>
        </div>
      </div>

      {error && (
        <Alert type="error" className="mb-4">
          {error}
        </Alert>
      )}

      {activeTab === "rates" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Rate Comparison Form */}
          <Card>
            <CardHeader>
              <CardTitle>Package & Address Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Package Info */}
              <div className="space-y-3">
                <h3 className="font-semibold">Package Information</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label="Weight (grams)"
                    type="number"
                    value={packageInfo.weight}
                    onChange={(e) =>
                      setPackageInfo((prev) => ({
                        ...prev,
                        weight: parseInt(e.target.value),
                      }))
                    }
                  />
                  <Input
                    label="Declared Value (TRY)"
                    type="number"
                    value={packageInfo.declaredValue}
                    onChange={(e) =>
                      setPackageInfo((prev) => ({
                        ...prev,
                        declaredValue: parseFloat(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    label="Length (cm)"
                    type="number"
                    value={packageInfo.dimensions.length}
                    onChange={(e) =>
                      setPackageInfo((prev) => ({
                        ...prev,
                        dimensions: {
                          ...prev.dimensions,
                          length: parseInt(e.target.value),
                        },
                      }))
                    }
                  />
                  <Input
                    label="Width (cm)"
                    type="number"
                    value={packageInfo.dimensions.width}
                    onChange={(e) =>
                      setPackageInfo((prev) => ({
                        ...prev,
                        dimensions: {
                          ...prev.dimensions,
                          width: parseInt(e.target.value),
                        },
                      }))
                    }
                  />
                  <Input
                    label="Height (cm)"
                    type="number"
                    value={packageInfo.dimensions.height}
                    onChange={(e) =>
                      setPackageInfo((prev) => ({
                        ...prev,
                        dimensions: {
                          ...prev.dimensions,
                          height: parseInt(e.target.value),
                        },
                      }))
                    }
                  />
                </div>
              </div>

              {/* From Address */}
              <div className="space-y-3">
                <h3 className="font-semibold">From Address (Sender)</h3>
                <Input
                  label="Name/Company"
                  value={fromAddress.name}
                  onChange={(e) =>
                    setFromAddress((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                />
                <Input
                  label="Address"
                  value={fromAddress.address1}
                  onChange={(e) =>
                    setFromAddress((prev) => ({
                      ...prev,
                      address1: e.target.value,
                    }))
                  }
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label="City"
                    value={fromAddress.city}
                    onChange={(e) =>
                      setFromAddress((prev) => ({
                        ...prev,
                        city: e.target.value,
                      }))
                    }
                  />
                  <Input
                    label="District"
                    value={fromAddress.district}
                    onChange={(e) =>
                      setFromAddress((prev) => ({
                        ...prev,
                        district: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label="Postal Code"
                    value={fromAddress.postalCode}
                    onChange={(e) =>
                      setFromAddress((prev) => ({
                        ...prev,
                        postalCode: e.target.value,
                      }))
                    }
                  />
                  <Input
                    label="Phone"
                    value={fromAddress.phone}
                    onChange={(e) =>
                      setFromAddress((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              {/* To Address */}
              <div className="space-y-3">
                <h3 className="font-semibold">To Address (Recipient)</h3>
                <Input
                  label="Name"
                  value={toAddress.name}
                  onChange={(e) =>
                    setToAddress((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
                <Input
                  label="Address"
                  value={toAddress.address1}
                  onChange={(e) =>
                    setToAddress((prev) => ({
                      ...prev,
                      address1: e.target.value,
                    }))
                  }
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label="City"
                    value={toAddress.city}
                    onChange={(e) =>
                      setToAddress((prev) => ({
                        ...prev,
                        city: e.target.value,
                      }))
                    }
                  />
                  <Input
                    label="District"
                    value={toAddress.district}
                    onChange={(e) =>
                      setToAddress((prev) => ({
                        ...prev,
                        district: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label="Postal Code"
                    value={toAddress.postalCode}
                    onChange={(e) =>
                      setToAddress((prev) => ({
                        ...prev,
                        postalCode: e.target.value,
                      }))
                    }
                  />
                  <Input
                    label="Phone"
                    value={toAddress.phone}
                    onChange={(e) =>
                      setToAddress((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              {/* Carrier Selection */}
              <div className="space-y-3">
                <h3 className="font-semibold">Carrier Selection (Optional)</h3>
                <Select
                  value={selectedCarrier}
                  onChange={(e) => setSelectedCarrier(e.target.value)}
                  options={[
                    { value: "", label: "Compare All Carriers" },
                    ...carriers.map((carrier) => ({
                      value: carrier.code,
                      label: carrier.name,
                    })),
                  ]}
                />
              </div>

              <Button
                onClick={compareRates}
                disabled={loading}
                className="w-full"
              >
                {loading ? <Loader size="sm" /> : "Compare Shipping Rates"}
              </Button>
            </CardContent>
          </Card>

          {/* Rate Results */}
          <Card>
            <CardHeader>
              <CardTitle>Shipping Rate Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              {rates.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  Fill in the package and address details, then click "Compare
                  Shipping Rates" to see available options.
                </div>
              ) : (
                <div className="space-y-4">
                  {rates.map((carrier, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-lg">
                          {carrier.carrierName}
                        </h3>
                        <span
                          className={`px-2 py-1 rounded text-sm ${
                            carrier.success
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {carrier.success ? "Available" : "Error"}
                        </span>
                      </div>

                      {carrier.success ? (
                        <div className="space-y-2">
                          {carrier.rates.map((rate, rateIndex) => (
                            <div
                              key={rateIndex}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded"
                            >
                              <div>
                                <div className="font-medium">
                                  {rate.serviceName}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {rate.estimatedDeliveryDays} •{" "}
                                  {rate.features?.join(", ")}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xl font-bold text-blue-600">
                                  {rate.price} {rate.currency}
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    createShippingLabel(carrier.carrier, rate)
                                  }
                                  disabled={loading}
                                  className="mt-1"
                                >
                                  Create Label
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-red-600">
                          Error: {carrier.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "tracking" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tracking Form */}
          <Card>
            <CardHeader>
              <CardTitle>Package Tracking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Tracking Number"
                value={trackingInfo.trackingNumber}
                onChange={(e) =>
                  setTrackingInfo((prev) => ({
                    ...prev,
                    trackingNumber: e.target.value,
                  }))
                }
                placeholder="Enter tracking number"
              />

              <Select
                label="Carrier"
                value={trackingInfo.carrier}
                onChange={(e) =>
                  setTrackingInfo((prev) => ({
                    ...prev,
                    carrier: e.target.value,
                  }))
                }
                options={[
                  { value: "", label: "Select Carrier" },
                  ...carriers.map((carrier) => ({
                    value: carrier.code,
                    label: carrier.name,
                  })),
                ]}
              />

              <Button
                onClick={trackPackage}
                disabled={
                  loading ||
                  !trackingInfo.trackingNumber ||
                  !trackingInfo.carrier
                }
                className="w-full"
              >
                {loading ? <Loader size="sm" /> : "Track Package"}
              </Button>
            </CardContent>
          </Card>

          {/* Tracking Results */}
          <Card>
            <CardHeader>
              <CardTitle>Tracking Information</CardTitle>
            </CardHeader>
            <CardContent>
              {!trackingData ? (
                <div className="text-center text-gray-500 py-8">
                  Enter a tracking number and select a carrier to track your
                  package.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Current Status */}
                  <div className="border rounded-lg p-4 bg-blue-50">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">Current Status</h3>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                          trackingData.status
                        )}`}
                      >
                        {trackingData.statusDescription}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <div>Tracking: {trackingData.trackingNumber}</div>
                      <div>Carrier: {trackingData.carrierName}</div>
                      {trackingData.estimatedDeliveryDate && (
                        <div>
                          Est. Delivery:{" "}
                          {trackingData.estimatedDeliveryDate
                            ? new Date(
                                trackingData.estimatedDeliveryDate
                              ).toLocaleDateString("tr-TR")
                            : "N/A"}
                        </div>
                      )}
                      {trackingData.currentLocation && (
                        <div>
                          Location: {trackingData.currentLocation.city} -{" "}
                          {trackingData.currentLocation.facility}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tracking Events */}
                  <div>
                    <h4 className="font-semibold mb-3">Tracking History</h4>
                    <div className="space-y-3">
                      {trackingData.events?.map((event, index) => (
                        <div
                          key={index}
                          className="flex items-start space-x-3 pb-3 border-b last:border-b-0"
                        >
                          <div
                            className={`w-3 h-3 rounded-full mt-1 ${getStatusColor(
                              event.status
                            )
                              .replace("text-", "bg-")
                              .replace("100", "500")}`}
                          ></div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div className="font-medium">
                                {event.description}
                              </div>
                              <div className="text-sm text-gray-500">
                                {event.date && event.time
                                  ? new Date(
                                      `${event.date} ${event.time}`
                                    ).toLocaleString("tr-TR")
                                  : "N/A"}
                              </div>
                            </div>
                            {event.location && (
                              <div className="text-sm text-gray-600">
                                {event.location}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Supported Carriers Info */}
      <Card>
        <CardHeader>
          <CardTitle>Supported Turkish Carriers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {carriers.map((carrier, index) => (
              <div key={index} className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-2">{carrier.name}</h3>
                <p className="text-sm text-gray-600 mb-3">
                  {carrier.description}
                </p>
                <div className="space-y-2">
                  <div>
                    <span className="font-medium">Coverage:</span>{" "}
                    {carrier.coverage}
                  </div>
                  <div>
                    <span className="font-medium">Delivery:</span>{" "}
                    {carrier.estimatedDeliveryDays} days
                  </div>
                  <div>
                    <span className="font-medium">Features:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {carrier.features.map((feature, fIndex) => (
                        <span
                          key={fIndex}
                          className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShippingManager;
