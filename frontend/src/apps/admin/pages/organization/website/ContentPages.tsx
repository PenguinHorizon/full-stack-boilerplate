import { zodResolver } from "@hookform/resolvers/zod";
import { HelpCircle, Images, MessageSquareQuote, Star } from "lucide-react";
import { useState, type ReactNode } from "react";
import {
  Controller,
  useForm,
  type FieldValues,
  type Path,
  type UseFormSetError,
} from "react-hook-form";
import toast from "react-hot-toast";
import { contentApi, type ContentKind } from "@/shared/api/content";
import { applyServerErrors } from "@/shared/forms/server-errors";
import {
  faqInput,
  faqSchema,
  galleryInput,
  gallerySchema,
  testimonialInput,
  testimonialSchema,
  type FaqValues,
  type GalleryValues,
  type TestimonialValues,
} from "@/shared/schemas/content";
import { Button, FormAlert, FormField, Input, Modal, Textarea } from "@/shared/ui";
import type {
  AdminFaqResponse,
  AdminGalleryImageResponse,
  AdminTestimonialResponse,
} from "@/shared/types/api.generated";
import { useCurrentOrganization } from "../../../access/access-context";
import { ImageField } from "../../../components/media/MediaPicker";
import { ContentList, PublishedSwitch } from "./ContentList";
import {
  useFaqs,
  useGallery,
  useInvalidateContent,
  useTestimonials,
} from "./website-hooks";

type Image = { id: number; url: string; altText: string | null };

/** Save one item (create or update), then refresh its list; field errors go back to the form. */
function useSaveItem<V extends FieldValues>(
  kind: Exclude<ContentKind, "banners">,
  fields: Array<Path<V>>,
) {
  const organization = useCurrentOrganization();
  const invalidate = useInvalidateContent(organization.id);
  const [formError, setFormError] = useState<string | null>(null);
  const save = async (
    id: number | null,
    body: object,
    setError: UseFormSetError<V>,
    onDone: () => void,
  ) => {
    setFormError(null);
    try {
      if (id) await contentApi.update(organization.id, kind, id, body);
      else await contentApi.create(organization.id, kind, body);
      toast.success(id ? "Saved" : "Added");
      void invalidate(kind);
      onDone();
    } catch (error) {
      setFormError(applyServerErrors(error, setError, fields));
    }
  };
  return { save, formError };
}

function EditorModal({
  id,
  title,
  submitting,
  onClose,
  children,
}: {
  id: string;
  title: string;
  submitting: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={id} loading={submitting}>
            Save
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  );
}

/* ── Gallery ──────────────────────────────────────────────── */

function GalleryModal({
  item,
  onClose,
}: {
  item: AdminGalleryImageResponse | null;
  onClose: () => void;
}) {
  const [image, setImage] = useState<Image | null>(
    item ? { id: item.mediaId, url: item.url, altText: null } : null,
  );
  const { save, formError } = useSaveItem<GalleryValues>("gallery", [
    "mediaId",
    "caption",
    "tag",
  ]);
  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<GalleryValues>({
    resolver: zodResolver(gallerySchema),
    defaultValues: {
      mediaId: item?.mediaId ?? null,
      caption: item?.caption ?? "",
      tag: item?.tag ?? "",
      status: item?.status ?? "published",
    },
  });
  return (
    <EditorModal
      id="gallery-form"
      title={item ? "Edit photo" : "Add a photo"}
      submitting={isSubmitting}
      onClose={onClose}
    >
      <form
        id="gallery-form"
        noValidate
        className="space-y-4"
        onSubmit={handleSubmit((values) =>
          save(item?.id ?? null, galleryInput(values), setError, onClose),
        )}
      >
        {formError && <FormAlert>{formError}</FormAlert>}
        <ImageField
          label="Photo"
          aspect="wide"
          value={image}
          onChange={(asset) => {
            setImage(
              asset ? { id: asset.id, url: asset.url, altText: asset.altText } : null,
            );
            setValue("mediaId", asset?.id ?? null, {
              shouldDirty: true,
              shouldValidate: true,
            });
          }}
        />
        {errors.mediaId && (
          <p role="alert" className="text-xs font-medium text-danger">
            {errors.mediaId.message}
          </p>
        )}
        <FormField label="Caption" error={errors.caption?.message}>
          {(field) => <Input {...field} {...register("caption")} />}
        </FormField>
        <FormField
          label="Group"
          error={errors.tag?.message}
          hint="Visitors can filter by it, e.g. Treks or Landscapes"
        >
          {(field) => <Input {...field} {...register("tag")} />}
        </FormField>
        <Controller
          control={control}
          name="status"
          render={({ field }) => (
            <PublishedSwitch value={field.value} onChange={field.onChange} />
          )}
        />
      </form>
    </EditorModal>
  );
}

/** `/admin/:orgId/website/gallery`. */
export function GalleryPage() {
  const organization = useCurrentOrganization();
  const gallery = useGallery(organization.id);
  return (
    <ContentList
      kind="gallery"
      query={gallery}
      title="Gallery"
      description="Photos for the gallery page and the home page strip."
      icon={Images}
      addLabel="Add photo"
      emptyTitle="No photos yet"
      emptyDescription="Show off your places and experiences."
      deleteDescription="It disappears from the gallery. The image stays in your library."
      itemLabel={(item) => item.caption ?? `Photo ${item.id}`}
      renderItem={(item) => (
        <div className="flex items-center gap-3">
          <img
            src={item.url}
            alt=""
            loading="lazy"
            className="size-14 shrink-0 rounded-control border border-line object-cover"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">
              {item.caption ?? "No caption"}
            </p>
            {item.tag && <p className="text-xs text-ink-subtle">{item.tag}</p>}
          </div>
        </div>
      )}
      renderEditor={(item, onClose) => <GalleryModal item={item} onClose={onClose} />}
    />
  );
}

/* ── Reviews ──────────────────────────────────────────────── */

function TestimonialModal({
  item,
  onClose,
}: {
  item: AdminTestimonialResponse | null;
  onClose: () => void;
}) {
  const [avatar, setAvatar] = useState<Image | null>(
    item?.avatarMediaId && item.avatarUrl
      ? { id: item.avatarMediaId, url: item.avatarUrl, altText: null }
      : null,
  );
  const { save, formError } = useSaveItem<TestimonialValues>("testimonials", [
    "authorName",
    "authorDetail",
    "quote",
    "rating",
    "source",
  ]);
  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TestimonialValues>({
    resolver: zodResolver(testimonialSchema),
    defaultValues: {
      authorName: item?.authorName ?? "",
      authorDetail: item?.authorDetail ?? "",
      quote: item?.quote ?? "",
      rating: item?.rating ? String(item.rating) : "",
      source: item?.source ?? "",
      avatarMediaId: item?.avatarMediaId ?? null,
      status: item?.status ?? "published",
    },
  });
  return (
    <EditorModal
      id="testimonial-form"
      title={item ? "Edit review" : "Add a review"}
      submitting={isSubmitting}
      onClose={onClose}
    >
      <form
        id="testimonial-form"
        noValidate
        className="space-y-4"
        onSubmit={handleSubmit((values) =>
          save(item?.id ?? null, testimonialInput(values), setError, onClose),
        )}
      >
        {formError && <FormAlert>{formError}</FormAlert>}
        <FormField label="What they said" required error={errors.quote?.message}>
          {(field) => <Textarea {...field} rows={4} {...register("quote")} />}
        </FormField>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Name" required error={errors.authorName?.message}>
            {(field) => <Input {...field} {...register("authorName")} />}
          </FormField>
          <FormField
            label="About them"
            error={errors.authorDetail?.message}
            hint="e.g. Regular since 2021"
          >
            {(field) => <Input {...field} {...register("authorDetail")} />}
          </FormField>
          <FormField label="Stars" error={errors.rating?.message} hint="1 to 5, optional">
            {(field) => <Input {...field} inputMode="numeric" {...register("rating")} />}
          </FormField>
          <FormField
            label="Where it was posted"
            error={errors.source?.message}
            hint="e.g. Google"
          >
            {(field) => <Input {...field} {...register("source")} />}
          </FormField>
        </div>
        <ImageField
          label="Photo (optional)"
          value={avatar}
          onChange={(asset) => {
            setAvatar(
              asset ? { id: asset.id, url: asset.url, altText: asset.altText } : null,
            );
            setValue("avatarMediaId", asset?.id ?? null, { shouldDirty: true });
          }}
        />
        <Controller
          control={control}
          name="status"
          render={({ field }) => (
            <PublishedSwitch value={field.value} onChange={field.onChange} />
          )}
        />
      </form>
    </EditorModal>
  );
}

/** `/admin/:orgId/website/testimonials`. */
export function TestimonialsPage() {
  const organization = useCurrentOrganization();
  const testimonials = useTestimonials(organization.id);
  return (
    <ContentList
      kind="testimonials"
      query={testimonials}
      title="Reviews"
      description="Kind words from customers, shown on the home page."
      icon={MessageSquareQuote}
      addLabel="Add review"
      emptyTitle="No reviews yet"
      emptyDescription="Copy your best reviews here, with the customer's permission."
      deleteDescription="It disappears from the website."
      itemLabel={(item) => `review by ${item.authorName}`}
      renderItem={(item) => (
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm text-ink">“{item.quote}”</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-subtle">
            {item.authorName}
            {item.rating && (
              <>
                {" · "}
                <Star
                  size={12}
                  className="fill-current text-warning"
                  aria-hidden="true"
                />{" "}
                {item.rating}
              </>
            )}
            {item.source && ` · ${item.source}`}
          </p>
        </div>
      )}
      renderEditor={(item, onClose) => <TestimonialModal item={item} onClose={onClose} />}
    />
  );
}

/* ── FAQs ─────────────────────────────────────────────────── */

function FaqModal({
  item,
  onClose,
}: {
  item: AdminFaqResponse | null;
  onClose: () => void;
}) {
  const { save, formError } = useSaveItem<FaqValues>("faqs", [
    "category",
    "question",
    "answer",
  ]);
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FaqValues>({
    resolver: zodResolver(faqSchema),
    defaultValues: {
      category: item?.category ?? "General",
      question: item?.question ?? "",
      answer: item?.answer ?? "",
      status: item?.status ?? "published",
    },
  });
  return (
    <EditorModal
      id="faq-form"
      title={item ? "Edit question" : "Add a question"}
      submitting={isSubmitting}
      onClose={onClose}
    >
      <form
        id="faq-form"
        noValidate
        className="space-y-4"
        onSubmit={handleSubmit((values) =>
          save(item?.id ?? null, faqInput(values), setError, onClose),
        )}
      >
        {formError && <FormAlert>{formError}</FormAlert>}
        <FormField label="Question" required error={errors.question?.message}>
          {(field) => <Input {...field} {...register("question")} />}
        </FormField>
        <FormField label="Answer" required error={errors.answer?.message}>
          {(field) => <Textarea {...field} rows={5} {...register("answer")} />}
        </FormField>
        <FormField
          label="Topic"
          required
          error={errors.category?.message}
          hint="Questions are grouped by topic, e.g. Booking"
        >
          {(field) => <Input {...field} {...register("category")} />}
        </FormField>
        <Controller
          control={control}
          name="status"
          render={({ field }) => (
            <PublishedSwitch value={field.value} onChange={field.onChange} />
          )}
        />
      </form>
    </EditorModal>
  );
}

/** `/admin/:orgId/website/faqs`. */
export function FaqsPage() {
  const organization = useCurrentOrganization();
  const faqs = useFaqs(organization.id);
  return (
    <ContentList
      kind="faqs"
      query={faqs}
      title="FAQs"
      description="Answers for the FAQ page. Topics appear in the order of their first question."
      icon={HelpCircle}
      addLabel="Add question"
      emptyTitle="No questions yet"
      emptyDescription="Answer what customers ask most: booking, payment, what to bring."
      deleteDescription="It disappears from the FAQ page."
      itemLabel={(item) => item.question}
      renderItem={(item) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{item.question}</p>
          <p className="truncate text-xs text-ink-subtle">
            {item.category} · {item.answer}
          </p>
        </div>
      )}
      renderEditor={(item, onClose) => <FaqModal item={item} onClose={onClose} />}
    />
  );
}
