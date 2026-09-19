import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { AppLayout } from '../components/layout/AppLayout';
import { CalendarLayout } from '../components/layout/CalendarLayout';
import { BudgetUtilizationLayout } from '../features/budget-utilization-dashboard/BudgetUtilizationLayout';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { PrivacyNoticePage } from '../features/legal/PrivacyNoticePage';
import { ForgotPasswordPage } from '../features/auth/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '../features/auth/pages/ResetPasswordPage';
import { SetNewPasswordPage } from '../features/auth/pages/SetNewPasswordPage';
import { AuthCallbackPage } from '../features/auth/pages/AuthCallbackPage';
import { PendingApprovalPage } from '../features/auth/pages/PendingApprovalPage';
import { PublicHomePage } from '../features/public-home/pages/PublicHomePage';
import { PublicWebPageDetailPage } from '../features/public-home/pages/PublicWebPageDetailPage';
import { StrategicPolicyHomePage } from '../features/public-home/pages/StrategicPolicyHomePage';
import { PortalPage } from '../features/portal/PortalPage';
import { RopaPage } from '../features/ropa/RopaPage';
import { SatisfactionSurveyPage } from '../features/surveys/SatisfactionSurveyPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { AnalyticsPage } from '../features/analytics/AnalyticsPage';
import { RecommendationsPage } from '../features/recommendations/RecommendationsPage';
import { CourseListPage } from '../features/courses/CourseListPage';
import { TrainingRecordsPage } from '../features/training-records/TrainingRecordsPage';
import { ProfilePage } from '../features/personnel/ProfilePage';
import { PersonnelListPage } from '../features/personnel/PersonnelListPage';
import { IndividualProfilePage } from '../features/personnel/IndividualProfilePage';
import { SelfServicePage } from '../features/self-service/SelfServicePage';
import { AccountSettingsPage } from '../features/settings/AccountSettingsPage';
import { GuestRoute } from '../components/auth/GuestRoute';
import { ReportsPage } from '../features/reports/ReportsPage';
import { UserManagementPage } from '../features/admin/UserManagementPage';
import { SecurityPage } from '../features/admin/SecurityPage';
import { StrategyCalendarPage } from '../features/strategy-calendar/StrategyCalendarPage';
import { MeetingRoomBookingPage } from '../features/strategy-calendar/MeetingRoomBookingPage';
import { BudgetUtilizationDashboardPage } from '../features/budget-utilization-dashboard/pages/BudgetUtilizationDashboardPage';
import { BudgetUtilizationItemsPage } from '../features/budget-utilization-dashboard/pages/BudgetUtilizationItemsPage';
import { BudgetUtilizationManagePage } from '../features/budget-utilization-dashboard/pages/BudgetUtilizationManagePage';
import { ItAssetsPage } from '../features/it-assets/ItAssetsPage';
import { ItAssetsManagePage } from '../features/it-assets/ItAssetsManagePage';
import { SiteManagerPage } from '../features/site-manager/pages/SiteManagerPage';
import { SpdServiceDashboardPage } from '../features/spd-service/SpdServiceDashboardPage';
import { SpdServiceMyRequestsPage } from '../features/spd-service/SpdServiceMyRequestsPage';
import { SpdServiceRequestPage } from '../features/spd-service/SpdServiceRequestPage';
import { SpdServiceTelegramSettingsPage } from '../features/spd-service/SpdServiceTelegramSettingsPage';
import { SpdServiceTicketListPage } from '../features/spd-service/SpdServiceTicketListPage';
import { ForbiddenPage } from '../features/system/ForbiddenPage';
import { NotFoundPage } from '../features/system/NotFoundPage';
import { BUDGET_ITEMS_MANAGE_PERMISSION, KPIDSP_INDICATORS_MANAGE_PERMISSION } from '../constants/permissions';
import { KpiDspLayout } from '../features/kpidsp/KpiDspLayout';
import DashboardOverview from '../features/kpidsp/src/pages/DashboardOverview/index';
import Dashboard from '../features/kpidsp/src/pages/Dashboard';
import DashboardHealth from '../features/kpidsp/src/pages/DashboardHealth/index';
import DataEntry from '../features/kpidsp/src/pages/DataEntry';
import DataEntryHealth from '../features/kpidsp/src/pages/DataEntryHealth';
import ManageSDGs from '../features/kpidsp/src/pages/ManageSDGs';
import ManageHealth from '../features/kpidsp/src/pages/ManageHealth';
import KPIGroup from '../features/kpidsp/src/pages/KPIGroup';
import NasRedirectPage from '../features/portal/NasRedirectPage';

export const router = createBrowserRouter([
  {
    path: '/nas',
    element: <NasRedirectPage />,
  },
  {
    path: '/',
    element: <StrategicPolicyHomePage />,
  },
  {
    path: '/home',
    element: <StrategicPolicyHomePage />,
  },
  {
    path: '/strategic-repository',
    element: <PublicHomePage />,
  },
  {
    path: '/strategic-repository/pages/:slug',
    element: <PublicWebPageDetailPage />,
  },
  {
    path: '/privacy-notice',
    element: <PrivacyNoticePage />,
  },
  {
    element: <KpiDspLayout />,
    children: [
      {
        path: '/kpi',
        element: <DashboardOverview />,
      },
      {
        path: '/kpi/sdgs',
        element: <Dashboard categoryFilter="SDGs" />,
      },
      {
        path: '/kpi/health',
        element: <DashboardHealth />,
      },
      {
        path: '/kpi/group/:groupId',
        element: <KPIGroup />,
      },
      {
        path: '/kpidsp',
        element: <Navigate to="/kpi" replace />,
      },
      {
        path: '/kpidsp/sdgs',
        element: <Navigate to="/kpi/sdgs" replace />,
      },
      {
        path: '/kpidsp/health',
        element: <Navigate to="/kpi/health" replace />,
      },
      {
        path: '/kpidsp/group/:groupId',
        element: <KPIGroup />,
      },
    ],
  },
  {
    element: <GuestRoute />,
    children: [
      {
        path: '/login',
        element: <LoginPage />,
      },
      {
        path: '/forgot-password',
        element: <ForgotPasswordPage />,
      },
    ],
  },
  {
    path: '/reset-password',
    element: <ResetPasswordPage />,
  },
  {
    path: '/set-new-password',
    element: <SetNewPasswordPage />,
  },

  {
    path: '/auth/callback',
    element: <AuthCallbackPage />,
  },
  {
    element: <ProtectedRoute allowedRoles={['super_admin', 'admin', 'executive', 'hr', 'personnel']} />,
    children: [
      {
        path: '/portal',
        element: <PortalPage />,
      },
      {
        path: '/ropa',
        element: <RopaPage />,
      },
      {
        path: '/satisfaction-survey',
        element: <SatisfactionSurveyPage />,
      },
      {
        path: '/satisfaction-survey/:surveyCode',
        element: <SatisfactionSurveyPage />,
      },
      {
        path: '/pending-approval',
        element: <PendingApprovalPage />,
      },
      {
        path: '/it-assets',
        element: <ItAssetsPage />,
      },
      {
        path: '/spd-service/request',
        element: <SpdServiceRequestPage />,
      },
      {
        path: '/spd-service/my-requests',
        element: <SpdServiceMyRequestsPage />,
      },
      {
        element: <CalendarLayout />,
        children: [
          {
            path: '/strategy-calendar',
            element: <StrategyCalendarPage />,
          },
          {
            path: '/strategy-calendar/meeting-room-booking',
            element: <MeetingRoomBookingPage />,
          },
        ],
      },
      {
        element: <BudgetUtilizationLayout />,
        children: [
          {
            path: '/budget-utilization',
            element: <BudgetUtilizationDashboardPage />,
          },
        ],
      },
      {
        element: <AppLayout />,
        children: [
          {
            path: '/profile',
            element: <ProfilePage />,
          },
          {
            path: '/self-service',
            element: <SelfServicePage />,
          },
          {
            path: '/settings',
            element: <AccountSettingsPage />,
          },
        ],
      },
    ],
  },
  {
    element: (
      <ProtectedRoute
        allowedRoles={['super_admin', 'admin']}
        allowedPermissions={[KPIDSP_INDICATORS_MANAGE_PERMISSION]}
      />
    ),
    children: [
      {
        element: <KpiDspLayout />,
        children: [
          {
            path: '/kpi/entry/sdgs',
            element: <DataEntry />,
          },
          {
            path: '/kpi/entry/health',
            element: <DataEntryHealth />,
          },
          {
            path: '/kpi/manage/sdgs',
            element: <ManageSDGs />,
          },
          {
            path: '/kpi/manage/health',
            element: <ManageHealth />,
          },
          {
            path: '/kpi/entry',
            element: <Navigate to="/kpi/entry/sdgs" replace />,
          },
          {
            path: '/kpi/entry-health',
            element: <Navigate to="/kpi/entry/health" replace />,
          },
          {
            path: '/kpidsp/entry/sdgs',
            element: <Navigate to="/kpi/entry/sdgs" replace />,
          },
          {
            path: '/kpidsp/entry/health',
            element: <Navigate to="/kpi/entry/health" replace />,
          },
          {
            path: '/kpidsp/manage/sdgs',
            element: <Navigate to="/kpi/manage/sdgs" replace />,
          },
          {
            path: '/kpidsp/manage/health',
            element: <Navigate to="/kpi/manage/health" replace />,
          },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute allowedRoles={['super_admin', 'admin', 'executive', 'hr']} />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            path: '/dashboard',
            element: <DashboardPage />,
          },
          {
            path: '/analytics',
            element: <AnalyticsPage />,
          },
          {
            path: '/recommendations',
            element: <RecommendationsPage />,
          },
          {
            path: '/courses',
            element: <CourseListPage />,
          },
          {
            path: '/records',
            element: <TrainingRecordsPage />,
          },
          {
            path: '/personnel',
            element: <PersonnelListPage />,
          },
          {
            path: '/personnel/:id',
            element: <IndividualProfilePage />,
          },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute allowedRoles={['super_admin', 'admin', 'executive']} />,
    children: [
      {
        path: '/spd-service',
        element: <SpdServiceDashboardPage />,
      },
      {
        path: '/spd-service/tickets',
        element: <SpdServiceTicketListPage />,
      },
      {
        path: '/spd-service/settings',
        element: <SpdServiceTelegramSettingsPage />,
      },
      {
        path: '/spd-service/settings/telegram',
        element: <SpdServiceTelegramSettingsPage />,
      },
    ],
  },
  {
    element: <ProtectedRoute allowedRoles={['super_admin', 'admin', 'hr']} />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            path: '/admin/users',
            element: <UserManagementPage />,
          },
        ],
      },
    ],
  },
  {
    element: (
      <ProtectedRoute
        allowedRoles={['super_admin', 'admin']}
        allowedPermissions={[BUDGET_ITEMS_MANAGE_PERMISSION]}
      />
    ),
    children: [
      {
        element: <BudgetUtilizationLayout />,
        children: [
          {
            path: '/budget-utilization/items',
            element: <BudgetUtilizationItemsPage />,
          },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute allowedRoles={['super_admin', 'admin']} />,
    children: [
      {
        path: '/it-assets/manage',
        element: <ItAssetsManagePage />,
      },
      {
        element: <BudgetUtilizationLayout />,
        children: [
          {
            path: '/budget-utilization/import',
            element: <Navigate to="/budget-utilization/manage" replace />,
          },
          {
            path: '/budget-utilization/import/:batchId',
            element: <Navigate to="/budget-utilization/manage" replace />,
          },
          {
            path: '/budget-utilization/manage',
            element: <BudgetUtilizationManagePage />,
          },
        ],
      },
      {
        element: <AppLayout />,
        children: [
          {
            path: '/reports',
            element: <ReportsPage />,
          },
          {
            path: '/site-manager',
            element: <SiteManagerPage />,
          },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute allowedRoles={['super_admin']} />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            path: '/admin/security',
            element: <SecurityPage />,
          },
        ],
      },
    ],
  },
  {
    path: '/forbidden',
    element: <ForbiddenPage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
], {
  future: {
    v7_relativeSplatPath: true,
    v7_fetcherPersist: true,
    v7_normalizeFormMethod: true,
    v7_partialHydration: true,
    v7_skipActionErrorRevalidation: true,
  },
});
