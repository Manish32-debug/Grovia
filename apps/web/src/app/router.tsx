import { createBrowserRouter } from 'react-router-dom';
import { CustomerLayout } from '@/layouts/CustomerLayout';
import { AdminLayout } from '@/layouts/AdminLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { HomePage } from '@/pages/Home';
import { ShopPage } from '@/pages/Shop';
import { ProductPage } from '@/pages/Product';
import { CartPage } from '@/pages/Cart';
import { WishlistPage } from '@/pages/Wishlist';
import { CheckoutPage } from '@/pages/Checkout';
import { OrdersPage } from '@/pages/Orders';
import { OrderPage } from '@/pages/Order';
import { NotificationsPage } from '@/pages/Notifications';
import { SmartBasketPage } from '@/pages/SmartBasket';
import { ReviewsPage } from '@/pages/Reviews';
import { NotFoundPage } from '@/pages/NotFound';
import { LoginPage } from '@/pages/auth/Login';
import { RegisterPage } from '@/pages/auth/Register';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPassword';
import { ResetPasswordPage } from '@/pages/auth/ResetPassword';
import { VerifyEmailPage } from '@/pages/auth/VerifyEmail';
import { AccountPage } from '@/pages/Account';

import { AdminDashboardPage } from '@/pages/admin/AdminDashboard';
import { AdminProductsPage } from '@/pages/admin/AdminProducts';
import { AdminOrdersPage } from '@/pages/admin/AdminOrders';
import { AdminInventoryPage } from '@/pages/admin/AdminInventory';
import { AdminCategoriesPage } from '@/pages/admin/AdminCategories';
import { AdminDeliveryPage } from '@/pages/admin/AdminDelivery';
import { AdminIntelligencePage } from '@/pages/admin/AdminIntelligence';

import { DeliveryDashboardPage } from '@/pages/delivery/DeliveryDashboard';

import { Role } from '@grovia/shared';
import { useAuth } from '@/hooks/useAuth';
import type { ReactNode } from 'react';

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      {
        path: '/login',
        element: <LoginPage />,
      },
      {
        path: '/register',
        element: <RegisterPage />,
      },
      {
        path: '/forgot-password',
        element: <ForgotPasswordPage />,
      },
      {
        path: '/reset-password',
        element: <ResetPasswordPage />,
      },
      {
        path: '/verify-email',
        element: <VerifyEmailPage />,
      },
    ],
  },

  {
    element: <CustomerLayout />,
    children: [
      {
        path: '/',
        element: <HomePage />,
      },
      {
        path: '/search',
        element: <ShopPage />,
      },
      {
        path: '/products/:slug',
        element: <ProductPage />,
      },

      {
        element: <RequireAuth />,
        children: [
          {
            path: '/cart',
            element: <CartPage />,
          },
          {
            path: '/wishlist',
            element: <WishlistPage />,
          },
          {
            path: '/checkout',
            element: <CheckoutPage />,
          },
          {
            path: '/orders',
            element: <OrdersPage />,
          },
          {
            path: '/orders/:orderId',
            element: <OrderPage />,
          },
          {
            path: '/notifications',
            element: <NotificationsPage />,
          },
          {
            path: '/smart-basket',
            element: <SmartBasketPage />,
          },
          {
            path: '/reviews/:productId',
            element: <ReviewsPage />,
          },
          {
            path: '/account',
            element: <AccountPage />,
          },
          {
            path: '/delivery',
            element: (
              <RequireRole
                roles={[Role.DELIVERY_PARTNER]}
              >
                <DeliveryDashboardPage />
              </RequireRole>
            ),
          },
        ],
      },

      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },

  {
    element: <AdminLayout />,
    children: [
      {
        element: <RequireAuth />,
        children: [
          {
            path: '/admin',
            element: (
              <RequireRole
                roles={[Role.ADMIN]}
              >
                <AdminDashboardPage />
              </RequireRole>
            ),
          },
          {
            path: '/admin/products',
            element: (
              <RequireRole
                roles={[Role.ADMIN]}
              >
                <AdminProductsPage />
              </RequireRole>
            ),
          },
          {
            path: '/admin/orders',
            element: (
              <RequireRole
                roles={[Role.ADMIN]}
              >
                <AdminOrdersPage />
              </RequireRole>
            ),
          },
          {
            path: '/admin/inventory',
            element: (
              <RequireRole
                roles={[Role.ADMIN]}
              >
                <AdminInventoryPage />
              </RequireRole>
            ),
          },
          {
            path: '/admin/categories',
            element: (
              <RequireRole
                roles={[Role.ADMIN]}
              >
                <AdminCategoriesPage />
              </RequireRole>
            ),
          },
          {
            path: '/admin/delivery',
            element: (
              <RequireRole
                roles={[Role.ADMIN]}
              >
                <AdminDeliveryPage />
              </RequireRole>
            ),
          },
          {
            path: '/admin/intelligence',
            element: (
              <RequireRole
                roles={[Role.ADMIN]}
              >
                <AdminIntelligencePage />
              </RequireRole>
            ),
          },
        ],
      },
    ],
  },
]);

function RequireRole({
  roles,
  children,
}: {
  roles: Role[];
  children: ReactNode;
}) {
  // Role is already present in the authenticated session.
  // This UI gate is only for navigation; the API remains
  // the actual security boundary.
  const { user } = useAuth();

  if (
    !user ||
    !roles.includes(user.role as Role)
  ) {
    return <NotFoundPage />;
  }

  return <>{children}</>;
}