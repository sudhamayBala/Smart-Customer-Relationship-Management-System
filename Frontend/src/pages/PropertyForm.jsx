import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import "../style/PropertyForm.css";
import ConflictDialog from "../components/ConflictDialog";
import {
  useCreatePropertyMutation,
  useGetPropertyQuery,
  useGetPropertyFiltersQuery,
  useUpdatePropertyMutation
} from "../store/api/propertyApi";

const propertySchema = z.object({
  title: z.string().trim().min(1, "Property title is required"),
  type: z.string().min(1, "Property type is required"),
  listingType: z.string().min(1, "Listing type is required"),
  bhk: z.string().min(1, "BHK is required"),
  furnishing: z.string().min(1, "Furnishing is required"),
  status: z.string().min(1, "Status is required"),
  buildingName: z.string().trim().min(1, "Building name is required"),
  unitNo: z.string().trim().min(1, "Unit number is required"),
  floor: z.string(),
  totalFloors: z.string(),
  facing: z.string(),
  locality: z.string().trim().min(1, "Locality is required"),
  city: z.string().trim().min(1, "City is required"),
  address: z.string(),
  price: z.string().refine(
    (value) => Number(value) > 0,
    "Enter a valid price"
  ),
  carpetArea: z.string().refine(
    (value) => Number(value) > 0,
    "Enter a valid carpet area"
  ),
  ownerName: z.string().trim().min(1, "Owner name is required"),
  ownerPhone: z.string().regex(
    /^[6-9]\d{9}$/,
    "Enter a valid Indian mobile number"
  ),
  amenities: z.array(z.string())
});

const initialForm = {
  title: "",
  type: "Apartment",
  listingType: "Sale",
  bhk: "2",
  furnishing: "Semi Furnished",
  status: "Available",
  buildingName: "",
  unitNo: "",
  floor: "",
  totalFloors: "",
  facing: "",
  locality: "",
  city: "",
  address: "",
  price: "",
  carpetArea: "",
  ownerName: "",
  ownerPhone: "",
  amenities: []
};

const propertyFromResult = (result) =>
  result?.data || result?.property || result;

const propertyToFormValues = (property = {}) => ({
  title: property.title || "",
  type: property.type || "Apartment",
  listingType: String(property.listingType || "SALE").toUpperCase() === "RENT" ? "Rent" : "Sale",
  bhk: String(property.bhk ?? "2"),
  furnishing: property.furnishing || "Semi Furnished",
  status: property.status || "Available",
  buildingName: property.buildingName || "",
  unitNo: property.unitNo || "",
  floor: property.floor != null ? String(property.floor) : "",
  totalFloors: property.totalFloors != null ? String(property.totalFloors) : "",
  facing: property.facing || "",
  locality: property.locality || "",
  city: property.city || "",
  address: property.address || "",
  price: property.price != null ? String(property.price) : "",
  carpetArea: property.area != null
    ? String(property.area)
    : property.carpetArea != null
      ? String(property.carpetArea)
      : "",
  ownerName: property.ownerName || "",
  ownerPhone: property.ownerPhone || "",
  amenities: Array.isArray(property.amenities) ? property.amenities : []
});

const propertyToPayload = (data) => ({
  title: data.title.trim(),
  type: data.type,
  listingType: data.listingType.toUpperCase(),
  locality: data.locality.trim(),
  city: data.city.trim() || null,
  address: data.address.trim() || null,
  floor: data.floor === "" ? null : Number(data.floor),
  totalFloors: data.totalFloors === "" ? null : Number(data.totalFloors),
  furnishing: data.furnishing || null,
  facing: data.facing.trim() || null,
  status: data.status,
  amenities: data.amenities,
  bhk: Number(data.bhk),
  area: Number(data.carpetArea),
  price: Number(data.price),
  buildingName: data.buildingName.trim(),
  unitNo: data.unitNo.trim(),
  ownerName: data.ownerName.trim(),
  ownerPhone: data.ownerPhone
});

const conflictFieldLabels = {
  title: "Title",
  type: "Property type",
  listingType: "Listing type",
  bhk: "BHK",
  furnishing: "Furnishing",
  status: "Status",
  buildingName: "Building",
  unitNo: "Unit",
  floor: "Floor",
  totalFloors: "Total floors",
  facing: "Facing",
  locality: "Locality",
  city: "City",
  address: "Address",
  price: "Price",
  carpetArea: "Carpet area",
  ownerName: "Owner name",
  ownerPhone: "Owner phone",
  amenities: "Amenities"
};

const sameFieldValue = (left, right) =>
  Array.isArray(left) && Array.isArray(right)
    ? left.length === right.length && left.every((value) => right.includes(value))
    : left === right;

const formatConflictValue = (value) =>
  Array.isArray(value)
    ? value.length ? value.join(", ") : "—"
    : value == null || value === "" ? "—" : String(value);

const buildConflictFields = (base, yours, theirs, baseProperty, latestProperty) => {
  const fields = Object.keys(initialForm).map((key) => {
    const theirsChanged = !sameFieldValue(base[key], theirs[key]);
    const yoursChanged = !sameFieldValue(base[key], yours[key]);

    return {
      key,
      label: conflictFieldLabels[key],
      theirsValue: theirs[key],
      yoursValue: yours[key],
      theirs: formatConflictValue(theirs[key]),
      yours: formatConflictValue(yours[key]),
      theirsChanged,
      yoursChanged,
      conflict: theirsChanged && yoursChanged && !sameFieldValue(theirs[key], yours[key])
    };
  }).filter((field) => field.theirsChanged || field.yoursChanged);

  if (baseProperty?.assigneeId !== latestProperty?.assigneeId) {
    fields.push({
      key: "assigneeId",
      label: "Assignee",
      theirs: latestProperty?.assigneeId ? "Assigned" : "Unassigned",
      yours: "—",
      theirsChanged: true,
      yoursChanged: false,
      conflict: false
    });
  }

  return fields;
};

const defaultPropertyTypes = [
  "Apartment",
  "Villa",
  "Plot",
  "Commercial"
];

const listingTypes = [
  "Sale",
  "Rent"
];

const furnishingTypes = [
  "Fully Furnished",
  "Semi Furnished",
  "Unfurnished"
];

const defaultStatuses = [
  "Available",
  "Contacted",
  "Visit Scheduled",
  "Negotiation",
  "Closed"
];

const bhkOptions = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6+"
];

const defaultAmenityOptions = [
  "Parking",
  "Lift",
  "Security",
  "Swimming Pool",
  "Gym",
  "Club House",
  "Power Backup",
  "Garden",
  "CCTV"
];

function PropertyForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const { data: filterOptionsResult } = useGetPropertyFiltersQuery();
  const propertyTypes = filterOptionsResult?.data?.propertyTypes?.length
    ? filterOptionsResult.data.propertyTypes
    : defaultPropertyTypes;
  const statuses = filterOptionsResult?.data?.statuses?.length
    ? filterOptionsResult.data.statuses
    : defaultStatuses;
  const amenityOptions = filterOptionsResult?.data?.amenities?.length
    ? filterOptionsResult.data.amenities
    : defaultAmenityOptions;
  const localityOptions = filterOptionsResult?.data?.localities || [];

  const [duplicateError, setDuplicateError] = useState("");
  const [apiError, setApiError] = useState("");
  const [saved, setSaved] = useState(false);
  const [conflict, setConflict] = useState(null);
  const [conflictChoices, setConflictChoices] = useState({});
  const [isMerging, setIsMerging] = useState(false);

  const {
    data: propertyResult,
    isLoading: isPropertyLoading,
    isError: isPropertyError,
    error: propertyError,
    refetch: refetchProperty
  } = useGetPropertyQuery(id, {
    skip: !isEditMode
  });

  const [createProperty, { isLoading: isCreating }] =
    useCreatePropertyMutation();

  const [updateProperty, { isLoading: isUpdating }] =
    useUpdatePropertyMutation();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(propertySchema),
    defaultValues: initialForm
  });

  const price = watch("price");
  const carpetArea = watch("carpetArea");
  const amenities = watch("amenities");
  const buildingName = watch("buildingName");
  const unitNo = watch("unitNo");

  const isSubmitting = isCreating || isUpdating;

  const pricePerSqFt = useMemo(() => {
    const numericPrice = Number(price);
    const numericArea = Number(carpetArea);

    if (!numericPrice || !numericArea) {
      return 0;
    }

    return Math.round(numericPrice / numericArea);
  }, [price, carpetArea]);

  useEffect(() => {
    if (!isEditMode || !propertyResult) {
      return;
    }

    const property = propertyFromResult(propertyResult);

    if (!property) {
      return;
    }

    reset(propertyToFormValues(property));

    setSaved(false);
    setApiError("");
    setDuplicateError("");
  }, [isEditMode, propertyResult, reset]);

  const toggleAmenity = (amenity) => {
    const exists = amenities.includes(amenity);

    setValue(
      "amenities",
      exists
        ? amenities.filter((item) => item !== amenity)
        : [...amenities, amenity],
      {
        shouldDirty: true,
        shouldValidate: true
      }
    );

    setSaved(false);
  };

  const getApiMessage = (error) => {
    return (
      error?.data?.message ||
      error?.data?.error ||
      error?.error ||
      "Unable to save the property. Please try again."
    );
  };

  const isDuplicateResponse = (error) => {
    const message = getApiMessage(error).toLowerCase();

    return (
      error?.status === 409 &&
      (
        message.includes("duplicate") ||
        message.includes("already exists") ||
        message.includes("building") ||
        message.includes("unit")
      )
    );
  };

  const openConflict = async (baseProperty, baseValues, yourValues) => {
    try {
      const latestResult = await refetchProperty().unwrap();
      const latestProperty = propertyFromResult(latestResult);
      if (!latestProperty?.version) {
        throw new Error("The latest property version could not be loaded.");
      }

      const theirValues = propertyToFormValues(latestProperty);
      const fields = buildConflictFields(
        baseValues,
        yourValues,
        theirValues,
        baseProperty,
        latestProperty
      );
      setConflict({
        baseProperty,
        latestProperty,
        baseValues,
        yourValues,
        theirValues,
        fields,
        version: latestProperty.version
      });
      setConflictChoices(Object.fromEntries(
        fields.filter((field) => field.conflict).map((field) => [field.key, "theirs"])
      ));
    } catch (error) {
      setApiError(error?.data?.message || error?.message || "Could not load the latest property version.");
    }
  };

  const finishSave = () => {
    setConflict(null);
    setSaved(true);
    setTimeout(() => navigate("/properties"), 700);
  };

  const saveMergedProperty = async (choices) => {
    if (!conflict) return;
    const mergedValues = { ...conflict.theirValues };

    for (const field of conflict.fields) {
      if (field.conflict && choices[field.key] === "yours") {
        mergedValues[field.key] = field.yoursValue;
      } else if (!field.theirsChanged && field.yoursChanged) {
        mergedValues[field.key] = field.yoursValue;
      }
    }

    const validation = propertySchema.safeParse(mergedValues);
    if (!validation.success) {
      setApiError("The merged property has invalid field values. Review your changes and try again.");
      return;
    }

    setIsMerging(true);
    setApiError("");
    try {
      await updateProperty({
        id,
        ...propertyToPayload(mergedValues),
        version: conflict.version
      }).unwrap();
      finishSave();
    } catch (error) {
      if (isDuplicateResponse(error)) {
        setDuplicateError("This building and unit already exists for your tenant.");
      } else if (error?.status === 409) {
        await openConflict(conflict.latestProperty, conflict.theirValues, mergedValues);
      } else {
        setApiError(getApiMessage(error));
      }
    } finally {
      setIsMerging(false);
    }
  };

  const discardConflict = () => {
    if (conflict) reset(conflict.theirValues);
    setConflict(null);
    setConflictChoices({});
    setApiError("");
    setSaved(false);
  };

  const onSubmit = async (data) => {
    setDuplicateError("");
    setApiError("");
    setSaved(false);

    try {
      if (isEditMode) {
        const property = propertyFromResult(propertyResult);
        if (property?.version == null) {
          setApiError("The property version could not be loaded. Please refresh the page and try again.");
          return;
        }

        await updateProperty({
          id,
          ...propertyToPayload(data),
          version: property.version
        }).unwrap();
      } else {
        await createProperty(propertyToPayload(data)).unwrap();
      }

      finishSave();
    } catch (error) {
      if (isDuplicateResponse(error)) {
        setDuplicateError("This building and unit already exists for your tenant.");
        return;
      }

      if (error?.status === 409 && isEditMode) {
        const property = propertyFromResult(propertyResult);
        await openConflict(property, propertyToFormValues(property), data);
        return;
      }

      setApiError(getApiMessage(error));
    }
  };

  const handleCancel = () => {
    navigate("/properties");
  };

  if (isEditMode && isPropertyLoading) {
    return (
      <div className="property-form-page">
        <div className="property-form-section">
          <h2>Loading property...</h2>
        </div>
      </div>
    );
  }

  if (isEditMode && isPropertyError) {
    if ([403, 404].includes(propertyError?.status)) {
      return <Navigate to="/404" replace />;
    }

    return (
      <div className="property-form-page">
        <div className="property-form-section">
          <h2>Unable to load property</h2>
          <p className="property-form-error">
            The property could not be loaded.
          </p>
          <button
            type="button"
            className="property-form-secondary-button"
            onClick={handleCancel}
          >
            Back to properties
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="property-form-page">
      <div className="property-form-header">
        <div>
          <p className="property-form-eyebrow">
            PROPERTIES
          </p>

          <h1>
            {isEditMode
              ? "Edit Property"
              : "Add Property"}
          </h1>

          <p className="property-form-subtitle">
            {isEditMode
              ? "Update property information and keep your listing details current."
              : "Create a new property listing with complete property information."}
          </p>
        </div>

        <div className="property-form-header-actions">
          <button
            type="button"
            className="property-form-secondary-button"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>

          <button
            type="submit"
            form="property-form"
            className="property-form-primary-button"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Saving..."
              : isEditMode
                ? "Save changes"
                : "Create property"}
          </button>
        </div>
      </div>

      {saved && (
        <div className="property-form-success">
          {isEditMode
            ? "Property updated successfully."
            : "Property created successfully."}
        </div>
      )}

      {apiError && (
        <div className="property-form-error" role="alert">
          {apiError}
        </div>
      )}

      {duplicateError && (
        <div className="property-form-error" role="alert">
          {duplicateError}
        </div>
      )}

      <form
        id="property-form"
        className="property-form"
        onSubmit={handleSubmit(onSubmit)}
      >
        <section className="property-form-section">
          <div className="property-form-section-heading">
            <div className="property-form-section-number">
              01
            </div>

            <div>
              <h2>Basics</h2>
              <p>
                Core information about the property.
              </p>
            </div>
          </div>

          <div className="property-form-grid">
            <div className="property-form-field property-form-field-wide">
              <label htmlFor="title">
                Property title
              </label>

              <input
                id="title"
                {...register("title")}
                placeholder="3 BHK Luxury Apartment"
              />

              {errors.title && (
                <span className="property-form-error">
                  {errors.title.message}
                </span>
              )}
            </div>

            <div className="property-form-field">
              <label htmlFor="type">
                Property type
              </label>

              <select
                id="type"
                {...register("type")}
              >
                {propertyTypes.map((type) => (
                  <option
                    key={type}
                    value={type}
                  >
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="property-form-field">
              <label htmlFor="listingType">
                Listing type
              </label>

              <select
                id="listingType"
                {...register("listingType")}
              >
                {listingTypes.map((type) => (
                  <option
                    key={type}
                    value={type}
                  >
                    {type}
                  </option>
                ))}
              </select>

              {errors.listingType && (
                <span className="property-form-error">
                  {errors.listingType.message}
                </span>
              )}
            </div>

            <div className="property-form-field">
              <label htmlFor="bhk">
                BHK
              </label>

              <select
                id="bhk"
                {...register("bhk")}
              >
                {bhkOptions.map((bhk) => (
                  <option
                    key={bhk}
                    value={bhk}
                  >
                    {bhk} BHK
                  </option>
                ))}
              </select>

              {errors.bhk && (
                <span className="property-form-error">
                  {errors.bhk.message}
                </span>
              )}
            </div>

            <div className="property-form-field">
              <label htmlFor="furnishing">
                Furnishing
              </label>

              <select
                id="furnishing"
                {...register("furnishing")}
              >
                {furnishingTypes.map((item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="property-form-field">
              <label htmlFor="status">
                Status
              </label>

              <select
                id="status"
                {...register("status")}
              >
                {statuses.map((status) => (
                  <option
                    key={status}
                    value={status}
                  >
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="property-form-section">
          <div className="property-form-section-heading">
            <div className="property-form-section-number">
              02
            </div>

            <div>
              <h2>Location</h2>
              <p>
                Building and address information.
              </p>
            </div>
          </div>

          <div className="property-form-grid">
            <div className="property-form-field">
              <label htmlFor="buildingName">
                Building name
              </label>

              <input
                id="buildingName"
                {...register("buildingName")}
                placeholder="Skyline Towers"
              />

              {errors.buildingName && (
                <span className="property-form-error">
                  {errors.buildingName.message}
                </span>
              )}
            </div>

            <div className="property-form-field">
              <label htmlFor="unitNo">
                Unit number
              </label>

              <input
                id="unitNo"
                {...register("unitNo")}
                placeholder="A-1204"
              />

              {errors.unitNo && (
                <span className="property-form-error">
                  {errors.unitNo.message}
                </span>
              )}
            </div>

            <div className="property-form-field">
              <label htmlFor="floor">
                Floor
              </label>

              <input
                id="floor"
                type="number"
                min="0"
                {...register("floor")}
                placeholder="12"
              />
            </div>

            <div className="property-form-field">
              <label htmlFor="totalFloors">
                Total floors
              </label>

              <input
                id="totalFloors"
                type="number"
                min="1"
                {...register("totalFloors")}
                placeholder="25"
              />
            </div>

            <div className="property-form-field">
              <label htmlFor="locality">
                Locality
              </label>

              <input
                id="locality"
                list="property-locality-list"
                {...register("locality")}
                placeholder="New Town"
              />

              <datalist id="property-locality-list">
                {localityOptions.map((locality) => (
                  <option key={locality} value={locality} />
                ))}
              </datalist>

              {errors.locality && (
                <span className="property-form-error">
                  {errors.locality.message}
                </span>
              )}
            </div>

            <div className="property-form-field">
              <label htmlFor="city">
                City
              </label>

              <input
                id="city"
                {...register("city")}
                placeholder="Kolkata"
              />

              {errors.city && (
                <span className="property-form-error">
                  {errors.city.message}
                </span>
              )}
            </div>

            <div className="property-form-field">
              <label htmlFor="facing">Facing</label>
              <input
                id="facing"
                {...register("facing")}
                placeholder="East"
              />
            </div>

            <div className="property-form-field property-form-field-wide">
              <label htmlFor="address">
                Full address
              </label>

              <textarea
                id="address"
                rows="4"
                {...register("address")}
                placeholder="Enter the complete property address"
              />
            </div>

            {buildingName && unitNo && (
              <div className="property-form-duplicate">
                <div className="property-form-duplicate-icon">
                  !
                </div>

                <div>
                  <strong>
                    Duplicate check
                  </strong>

                  <p>
                    We will check whether this
                    building and unit already
                    exists for your tenant before
                    saving.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="property-form-section">
          <div className="property-form-section-heading">
            <div className="property-form-section-number">
              03
            </div>

            <div>
              <h2>Pricing &amp; size</h2>

              <p>
                Set the listing price and property
                area.
              </p>
            </div>
          </div>

          <div className="property-form-grid">
            <div className="property-form-field">
              <label htmlFor="price">
                Price (₹)
              </label>

              <input
                id="price"
                type="number"
                min="0"
                {...register("price")}
                placeholder="8500000"
              />

              {errors.price && (
                <span className="property-form-error">
                  {errors.price.message}
                </span>
              )}
            </div>

            <div className="property-form-field">
              <label htmlFor="carpetArea">
                Carpet area (sq ft)
              </label>

              <input
                id="carpetArea"
                type="number"
                min="0"
                {...register("carpetArea")}
                placeholder="1450"
              />

              {errors.carpetArea && (
                <span className="property-form-error">
                  {errors.carpetArea.message}
                </span>
              )}
            </div>

            <div className="property-form-field">
              <label htmlFor="pricePerSqFt">
                Price per sq ft
              </label>

              <div className="property-form-readonly">
                {pricePerSqFt
                  ? `₹${pricePerSqFt.toLocaleString(
                      "en-IN"
                    )}`
                  : "Calculated automatically"}
              </div>
            </div>
          </div>
        </section>

        <section className="property-form-section">
          <div className="property-form-section-heading">
            <div className="property-form-section-number">
              04
            </div>

            <div>
              <h2>Owner</h2>

              <p>
                Owner contact information.
              </p>
            </div>
          </div>

          <div className="property-form-grid">
            <div className="property-form-field">
              <label htmlFor="ownerName">
                Owner name
              </label>

              <input
                id="ownerName"
                {...register("ownerName")}
                placeholder="Rajesh Kumar"
              />

              {errors.ownerName && (
                <span className="property-form-error">
                  {errors.ownerName.message}
                </span>
              )}
            </div>

            <div className="property-form-field">
              <label htmlFor="ownerPhone">
                Owner phone
              </label>

              <input
                id="ownerPhone"
                type="tel"
                maxLength="10"
                {...register("ownerPhone", {
                  onChange: (event) => {
                    event.target.value =
                      event.target.value.replace(
                        /\D/g,
                        ""
                      );
                  }
                })}
                placeholder="9830012345"
              />

              {errors.ownerPhone && (
                <span className="property-form-error">
                  {errors.ownerPhone.message}
                </span>
              )}

              <span className="property-form-helper">
                Enter a 10-digit Indian mobile
                number.
              </span>
            </div>
          </div>
        </section>

        <section className="property-form-section">
          <div className="property-form-section-heading">
            <div className="property-form-section-number">
              05
            </div>

            <div>
              <h2>Amenities</h2>

              <p>
                Select the amenities available at
                this property.
              </p>
            </div>
          </div>

          <div className="property-form-amenities">
            {amenityOptions.map((amenity) => {
              const selected =
                amenities.includes(amenity);

              return (
                <button
                  type="button"
                  key={amenity}
                  className={
                    selected
                      ? "property-form-amenity selected"
                      : "property-form-amenity"
                  }
                  onClick={() =>
                    toggleAmenity(amenity)
                  }
                  disabled={isSubmitting}
                >
                  <span>
                    {selected ? "✓" : "+"}
                  </span>

                  {amenity}
                </button>
              );
            })}
          </div>
        </section>

        <div className="property-form-footer">
          <div>
            <strong>
              {isEditMode
                ? "Editing property"
                : "New property"}
            </strong>

            <span>
              Make sure all required information is
              correct before saving.
            </span>
          </div>

          <div className="property-form-footer-actions">
            <button
              type="button"
              className="property-form-secondary-button"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="property-form-primary-button"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Saving..."
                : isEditMode
                  ? "Save changes"
                  : "Create property"}
            </button>
          </div>
        </div>
      </form>
      <ConflictDialog
        open={Boolean(conflict)}
        onDiscard={discardConflict}
        onSaveMerged={saveMergedProperty}
        onChoose={(field, choice) => setConflictChoices((current) => ({ ...current, [field]: choice }))}
        propertyName={conflict?.latestProperty?.title || "this property"}
        version={conflict?.version}
        fields={conflict?.fields || []}
        choices={conflictChoices}
        saving={isMerging}
      />
    </div>
  );
}

export default PropertyForm;