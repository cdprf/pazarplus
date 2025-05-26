import React, { useState, useEffect } from "react";
import { cn } from "../utils/cn";
import {
  Card,
  Button,
  Badge,
  Table,
  Avatar,
  Input,
  Select,
  Modal,
  Tooltip,
} from "../components/ui";
import {
  ChartBarIcon,
  ShoppingCartIcon,
  UserGroupIcon,
  TruckIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

const Dashboard = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Mock data for demonstration
  const stats = [
    {
      title: "Total Orders",
      value: "2,847",
      change: "+12.5%",
      trend: "up",
      icon: ShoppingCartIcon,
      color: "primary",
    },
    {
      title: "Revenue",
      value: "₺142,850",
      change: "+8.2%",
      trend: "up",
      icon: ChartBarIcon,
      color: "success",
    },
    {
      title: "Customers",
      value: "1,205",
      change: "-2.1%",
      trend: "down",
      icon: UserGroupIcon,
      color: "warning",
    },
    {
      title: "Shipments",
      value: "1,934",
      change: "+15.3%",
      trend: "up",
      icon: TruckIcon,
      color: "info",
    },
  ];

  const recentOrders = [
    {
      id: "ORD-001",
      customer: "Ahmet Yılmaz",
      platform: "Trendyol",
      status: "processing",
      amount: "₺125.00",
      date: "2025-05-26",
    },
    {
      id: "ORD-002",
      customer: "Fatma Kaya",
      platform: "Hepsiburada",
      status: "shipped",
      amount: "₺89.50",
      date: "2025-05-25",
    },
    {
      id: "ORD-003",
      customer: "Mehmet Özkan",
      platform: "N11",
      status: "delivered",
      amount: "₺245.75",
      date: "2025-05-24",
    },
    {
      id: "ORD-004",
      customer: "Ayşe Demir",
      platform: "Trendyol",
      status: "pending",
      amount: "₺67.25",
      date: "2025-05-24",
    },
  ];

  const getStatusVariant = (status) => {
    const variants = {
      pending: "warning",
      processing: "info",
      shipped: "primary",
      delivered: "success",
      cancelled: "error",
    };
    return variants[status] || "default";
  };

  const getPlatformColor = (platform) => {
    const colors = {
      Trendyol:
        "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400",
      Hepsiburada:
        "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
      N11: "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400",
    };
    return (
      colors[platform] ||
      "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
    );
  };

  const filteredOrders = recentOrders.filter((order) => {
    const matchesSearch =
      order.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterStatus === "all" || order.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Overview of your marketplace performance
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="sm:w-auto">
          <PlusIcon className="w-4 h-4 mr-2" />
          New Order
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {stat.title}
                  </p>
                  <div className="flex items-baseline space-x-2">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stat.value}
                    </p>
                    <div
                      className={cn(
                        "flex items-center text-xs font-medium",
                        stat.trend === "up" ? "text-green-600" : "text-red-600"
                      )}
                    >
                      {stat.trend === "up" ? (
                        <ArrowUpIcon className="w-3 h-3 mr-1" />
                      ) : (
                        <ArrowDownIcon className="w-3 h-3 mr-1" />
                      )}
                      {stat.change}
                    </div>
                  </div>
                </div>
                <div
                  className={cn(
                    "p-3 rounded-lg",
                    stat.color === "primary" &&
                      "bg-primary-100 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400",
                    stat.color === "success" &&
                      "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400",
                    stat.color === "warning" &&
                      "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400",
                    stat.color === "info" &&
                      "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                  )}
                >
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Recent Orders */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Recent Orders
          </h2>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full sm:w-64"
              />
            </div>
            <Select
              value={filterStatus}
              onValueChange={setFilterStatus}
              className="w-full sm:w-40"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.Head>Order ID</Table.Head>
                <Table.Head>Customer</Table.Head>
                <Table.Head>Platform</Table.Head>
                <Table.Head>Status</Table.Head>
                <Table.Head>Amount</Table.Head>
                <Table.Head>Date</Table.Head>
                <Table.Head className="text-right">Actions</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {filteredOrders.map((order) => (
                <Table.Row key={order.id}>
                  <Table.Cell className="font-medium">{order.id}</Table.Cell>
                  <Table.Cell>
                    <div className="flex items-center space-x-3">
                      <Avatar
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                          order.customer
                        )}&background=6366f1&color=fff`}
                        alt={order.customer}
                        size="sm"
                      />
                      <span>{order.customer}</span>
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge className={getPlatformColor(order.platform)}>
                      {order.platform}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge variant={getStatusVariant(order.status)}>
                      {order.status}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell className="font-medium">
                    {order.amount}
                  </Table.Cell>
                  <Table.Cell className="text-gray-600 dark:text-gray-400">
                    {order.date}
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex items-center justify-end space-x-2">
                      <Tooltip content="View Order">
                        <Button variant="ghost" size="sm">
                          <EyeIcon className="w-4 h-4" />
                        </Button>
                      </Tooltip>
                      <Tooltip content="Edit Order">
                        <Button variant="ghost" size="sm">
                          <PencilIcon className="w-4 h-4" />
                        </Button>
                      </Tooltip>
                      <Tooltip content="Delete Order">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </Button>
                      </Tooltip>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-2">
              <ShoppingCartIcon className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
              No orders found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm || filterStatus !== "all"
                ? "Try adjusting your search or filter criteria."
                : "Get started by creating your first order."}
            </p>
          </div>
        )}
      </Card>

      {/* New Order Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Order"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Customer Name
              </label>
              <Input placeholder="Enter customer name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Platform
              </label>
              <Select>
                <option value="">Select platform</option>
                <option value="trendyol">Trendyol</option>
                <option value="hepsiburada">Hepsiburada</option>
                <option value="n11">N11</option>
              </Select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Order Amount
            </label>
            <Input type="number" placeholder="0.00" />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setIsModalOpen(false)}>Create Order</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Dashboard;
