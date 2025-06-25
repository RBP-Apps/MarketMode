"use client"

import { useParams } from "react-router-dom"
import AdminLayout from "../../components/layout/AdminLayout.jsx"
import SalesDataPage from "./SalesDataPage.jsx"
import ServiceDataPage from "./service-data-page.jsx"
import JockeyDataPage from "./jockey-data-page.jsx"
import AccountDataPage from "./account-data-page.jsx"
import WarehouseDataPage from "./ware-house-data.jsx"
import PurchaseDataPage from "./purchase-data-page.jsx"
import DirectorDataPage from "./director-data-page.jsx"
import ManagingDirector from "./managingDirector-data-page.jsx"
import AdminDataPage from "./admin-data-page.jsx"
import Coo from "./coo-data-page.jsx"

export default function DataPage() {
  const { category } = useParams()

  // Format the category name for display
  const formatCategoryName = (cat) => {
    if (cat === "coo") return "COO"
    return cat
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  // Render the appropriate component based on category
  switch (category) {
    case "main":
      return <AdminDataPage/>
    case "sales":
      return <SalesDataPage />
    // case "service":
    //   return <ServiceDataPage />
    // case "jockey":
    //   return <JockeyDataPage />
    case "account":
      return <AccountDataPage />
    case "warehouse":
      return <WarehouseDataPage />
      case "purchase":
        return <PurchaseDataPage/>
        case "director":
        return <DirectorDataPage/>
        case "managing-director":
          return <ManagingDirector/>
    //       case "coo":
    //       return <Coo/>
    default:
      return (
        <AdminLayout>
          <div className="space-y-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <h1 className="text-2xl font-bold tracking-tight text-purple-700">{formatCategoryName(category)} Data</h1>
            </div>

            <div className="rounded-lg border border-purple-200 shadow-md bg-white">
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100 p-4">
                <h2 className="text-purple-700 font-medium">{formatCategoryName(category)} Information</h2>
                <p className="text-purple-600 text-sm">
                  View and manage {formatCategoryName(category).toLowerCase()} data
                </p>
              </div>
              <div className="p-6">
                <div className="text-center py-12">
                  <p className="text-gray-500">{formatCategoryName(category)} data module is under development.</p>
                  <p className="text-gray-400 mt-2">
                    This section will display {formatCategoryName(category).toLowerCase()} specific information and
                    analytics.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </AdminLayout>
      )
  }
}
