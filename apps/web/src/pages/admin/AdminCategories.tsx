import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Edit3,
  FolderTree,
  Plus,
  RefreshCw,
  Save,
  X,
} from 'lucide-react';

import {
  createAdminCategory,
  adminCategories,
  updateAdminCategory,
} from '@/api/endpoints/store';

type Category = {
  id: string;
  name: string;
  slug: string;
  iconUrl: string | null;
  gstBasis?: number;
  displayOrder: number;
  isActive: boolean;
};

type CategoryForm = {
  name: string;
  slug: string;
  iconUrl: string;
  gstBasis: string;
  displayOrder: string;
  isActive: boolean;
};

const emptyForm: CategoryForm = {
  name: '',
  slug: '',
  iconUrl: '',
  gstBasis: '0',
  displayOrder: '0',
  isActive: true,
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function AdminCategoriesPage() {
  const [form, setForm] =
    useState<CategoryForm>(emptyForm);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [showForm, setShowForm] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const q = useQuery<Category[]>({
    queryKey: ['admin-categories'],
    queryFn: adminCategories,
  });

  const categories = q.data ?? [];

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
    setShowForm(true);
  }

  function openEdit(category: Category) {
    setEditingId(category.id);

    setForm({
      name: category.name,
      slug: category.slug,
      iconUrl: category.iconUrl ?? '',
      gstBasis: String(
        category.gstBasis ?? 0,
      ),
      displayOrder: String(
        category.displayOrder ?? 0,
      ),
      isActive: category.isActive,
    });

    setError(null);
    setShowForm(true);
  }

  function closeForm() {
    if (saving) {
      return;
    }

    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
  }

  function updateField(
    field: keyof CategoryForm,
    value: string | boolean,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setError(null);

    const name = form.name.trim();
    const slug = form.slug.trim().toLowerCase();
    const iconUrl = form.iconUrl.trim();
    const gstBasis = Number(form.gstBasis);
    const displayOrder = Number(
      form.displayOrder,
    );

    if (name.length < 2) {
      setError(
        'Category name must contain at least 2 characters.',
      );
      return;
    }

    if (
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
        slug,
      )
    ) {
      setError(
        'Slug must use lowercase letters, numbers and hyphens.',
      );
      return;
    }

    if (
      iconUrl &&
      !/^https?:\/\/.+/i.test(iconUrl)
    ) {
      setError(
        'Icon URL must be a valid http or https URL.',
      );
      return;
    }

    if (
      !Number.isInteger(gstBasis) ||
      gstBasis < 0 ||
      gstBasis > 2800
    ) {
      setError(
        'GST basis must be a whole number between 0 and 2800.',
      );
      return;
    }

    if (!Number.isInteger(displayOrder)) {
      setError(
        'Display order must be a whole number.',
      );
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name,
        slug,
        ...(iconUrl
          ? { iconUrl }
          : {}),
        gstBasis,
        displayOrder,
        isActive: form.isActive,
      };

      if (editingId) {
        await updateAdminCategory(
          editingId,
          payload,
        );
      } else {
        await createAdminCategory(
          payload,
        );
      }

      await q.refetch();
      closeForm();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to save category.',
      );
    } finally {
      setSaving(false);
    }
  }

  if (q.isPending) {
    return (
      <div className="space-y-4 pt-6">
        <div>
          <p className="text-caption font-semibold uppercase tracking-[0.12em] text-grove-600">
            Administration
          </p>

          <h1 className="mt-1 text-display">
            Categories
          </h1>
        </div>

        <div className="rounded-card bg-surface p-8 text-text-2 shadow-card">
          Loading categories…
        </div>
      </div>
    );
  }

  if (q.isError) {
    return (
      <div className="space-y-4 pt-6">
        <div>
          <p className="text-caption font-semibold uppercase tracking-[0.12em] text-grove-600">
            Administration
          </p>

          <h1 className="mt-1 text-display">
            Categories
          </h1>
        </div>

        <div className="rounded-card border border-red-100 bg-red-50 p-6">
          <p className="font-semibold text-red-700">
            Unable to load categories.
          </p>

          <button
            type="button"
            onClick={() =>
              void q.refetch()
            }
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white"
          >
            <RefreshCw className="size-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-caption font-semibold uppercase tracking-[0.12em] text-grove-600">
            Administration
          </p>

          <h1 className="mt-1 text-display">
            Categories
          </h1>

          <p className="mt-1 text-text-2">
            Organize the grocery catalog and control
            category visibility.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() =>
              void q.refetch()
            }
            disabled={q.isFetching}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-line bg-white px-4 py-2.5 text-sm font-semibold transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              className={[
                'size-4',
                q.isFetching
                  ? 'animate-spin'
                  : '',
              ].join(' ')}
            />
            Refresh
          </button>

          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-grove-700"
          >
            <Plus className="size-4" />
            Add category
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-card bg-surface p-4 shadow-card">
          <p className="text-caption text-text-3">
            Total
          </p>

          <p className="mt-1 text-2xl font-extrabold tabular">
            {categories.length}
          </p>
        </div>

        <div className="rounded-card bg-surface p-4 shadow-card">
          <p className="text-caption text-text-3">
            Active
          </p>

          <p className="mt-1 text-2xl font-extrabold tabular text-emerald-700">
            {
              categories.filter(
                (category) =>
                  category.isActive,
              ).length
            }
          </p>
        </div>

        <div className="rounded-card bg-surface p-4 shadow-card">
          <p className="text-caption text-text-3">
            Inactive
          </p>

          <p className="mt-1 text-2xl font-extrabold tabular text-text-2">
            {
              categories.filter(
                (category) =>
                  !category.isActive,
              ).length
            }
          </p>
        </div>

        <div className="rounded-card bg-surface p-4 shadow-card">
          <p className="text-caption text-text-3">
            Ordered
          </p>

          <p className="mt-1 text-2xl font-extrabold tabular">
            {categories.filter(
              (category) =>
                category.displayOrder >= 0,
            ).length}
          </p>
        </div>
      </div>

      {showForm && (
        <section className="rounded-card bg-surface p-6 shadow-card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-caption font-semibold uppercase tracking-[0.12em] text-grove-600">
                {editingId
                  ? 'Edit category'
                  : 'New category'}
              </p>

              <h2 className="mt-1 text-h2">
                {editingId
                  ? 'Update category'
                  : 'Create category'}
              </h2>
            </div>

            <button
              type="button"
              onClick={closeForm}
              disabled={saving}
              className="flex size-9 items-center justify-center rounded-full border border-line transition hover:bg-slate-50 disabled:opacity-50"
              aria-label="Close category form"
            >
              <X className="size-4" />
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-6 space-y-5"
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-semibold">
                  Name
                </span>

                <input
                  value={form.name}
                  onChange={(event) => {
                    const name =
                      event.target.value;

                    updateField(
                      'name',
                      name,
                    );

                    if (!editingId) {
                      updateField(
                        'slug',
                        slugify(name),
                      );
                    }
                  }}
                  placeholder="Fruits & Vegetables"
                  className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-grove-500"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold">
                  Slug
                </span>

                <input
                  value={form.slug}
                  onChange={(event) =>
                    updateField(
                      'slug',
                      event.target.value
                        .toLowerCase()
                        .replace(
                          /[^a-z0-9-]/g,
                          '-',
                        ),
                    )
                  }
                  placeholder="fruits-vegetables"
                  className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-grove-500"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold">
                  Icon URL
                </span>

                <input
                  value={form.iconUrl}
                  onChange={(event) =>
                    updateField(
                      'iconUrl',
                      event.target.value,
                    )
                  }
                  placeholder="https://example.com/icon.png"
                  className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-grove-500"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold">
                  GST basis points
                </span>

                <input
                  type="number"
                  min="0"
                  max="2800"
                  step="1"
                  value={form.gstBasis}
                  onChange={(event) =>
                    updateField(
                      'gstBasis',
                      event.target.value,
                    )
                  }
                  className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-grove-500"
                />

                <span className="text-xs text-text-3">
                  500 = 5%, 1800 = 18%.
                </span>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold">
                  Display order
                </span>

                <input
                  type="number"
                  step="1"
                  value={
                    form.displayOrder
                  }
                  onChange={(event) =>
                    updateField(
                      'displayOrder',
                      event.target.value,
                    )
                  }
                  className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-grove-500"
                />
              </label>

              <label className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) =>
                    updateField(
                      'isActive',
                      event.target.checked,
                    )
                  }
                  className="size-4 accent-grove-600"
                />

                <span>
                  <span className="block text-sm font-semibold">
                    Active category
                  </span>

                  <span className="block text-xs text-text-3">
                    Visible to customers when active.
                  </span>
                </span>
              </label>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-grove-700 disabled:opacity-50"
              >
                <Save className="size-4" />

                {saving
                  ? 'Saving…'
                  : editingId
                    ? 'Save changes'
                    : 'Create category'}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="overflow-hidden rounded-card bg-surface shadow-card">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="text-h2">
              Catalog categories
            </h2>

            <p className="mt-1 text-sm text-text-2">
              {categories.length} categories
              configured.
            </p>
          </div>

          <FolderTree className="size-5 text-grove-600" />
        </div>

        <div className="divide-y divide-line">
          {categories.map(
            (category) => (
              <div
                key={category.id}
                className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-grove-50 text-grove-700">
                    {category.iconUrl ? (
                      <img
                        src={
                          category.iconUrl
                        }
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <FolderTree className="size-5" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold">
                        {category.name}
                      </h3>

                      <span
                        className={[
                          'rounded-full px-2 py-1 text-xs font-semibold',
                          category.isActive
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-text-3',
                        ].join(' ')}
                      >
                        {category.isActive
                          ? 'Active'
                          : 'Inactive'}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-text-3">
                      /{category.slug}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <div className="text-right">
                    <p className="text-xs text-text-3">
                      Display order
                    </p>

                    <p className="mt-1 font-bold tabular">
                      {category.displayOrder}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      openEdit(category)
                    }
                    className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-semibold transition hover:bg-slate-50"
                  >
                    <Edit3 className="size-4" />
                    Edit
                  </button>
                </div>
              </div>
            ),
          )}
        </div>

        {categories.length === 0 && (
          <div className="p-10 text-center">
            <p className="font-semibold">
              No categories found.
            </p>

            <p className="mt-1 text-sm text-text-3">
              Create the first catalog category.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}