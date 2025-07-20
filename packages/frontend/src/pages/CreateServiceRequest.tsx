import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import {
    Box,
    Typography,
    Paper,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Alert,
    Container,
    CircularProgress,
    Grid,
    Card,
    CardContent,
    Chip,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import {
    ArrowBack as ArrowBackIcon,
    Save as SaveIcon,
    Cancel as CancelIcon,
} from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";
import { serviceRequestService } from "../services/serviceRequestService";
import type {
    ServiceType,
    CreateServiceRequestRequest,
} from "../services/serviceRequestService";
import { apartmentService } from "../services/apartmentService";
import type { Apartment } from "../services/apartmentService";
import { bookingService } from "../services/bookingService";
import type { Booking } from "../services/bookingService";
import { userService } from "../services/userService";
import type { User } from "../services/userService";
import SearchableDropdown from "../components/SearchableDropdown";

export interface CreateServiceRequestProps {
    apartmentId?: number;
    bookingId?: number;
    whoPays?: "owner" | "renter" | "company"; // Restrict whoPays to allowed values
    onSuccess?: () => void;
    onCancel?: () => void;
    lockApartment?: boolean;
}

export default function CreateServiceRequest({
    apartmentId,
    bookingId,
    whoPays,
    onSuccess,
    onCancel,
    lockApartment,
}: CreateServiceRequestProps) {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { currentUser } = useAuth();
    const { id } = useParams<{ id: string }>();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Data states
    const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
    const [apartments, setApartments] = useState<Apartment[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [users, setUsers] = useState<User[]>([]);

    // Form data
    const [formData, setFormData] = useState<
        Omit<CreateServiceRequestRequest, "requester_id" | "who_pays"> & {
            requester_id?: number;
            who_pays: "owner" | "renter" | "company";
        }
    >({
        type_id: 0,
        apartment_id: apartmentId || 0,
        booking_id: bookingId,
        requester_id: currentUser?.id,
        date_action: undefined,
        status: "Created",
        who_pays: whoPays ?? "owner", // Use the passed whoPays or default to owner
        notes: "",
        assignee_id: undefined,
    });

    // Load initial data
    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                setError(null);

                const [serviceTypesData, apartmentsData, usersData] =
                    await Promise.all([
                        serviceRequestService.getServiceTypes({ limit: 100 }),
                        apartmentService.getApartments({ limit: 100 }),
                        userService.getUsers({ limit: 100 }),
                    ]);

                setServiceTypes(serviceTypesData.data);
                setApartments(apartmentsData.data);
                setUsers(usersData.data);

                // Pre-select service type if provided in URL
                const serviceTypeId = searchParams.get("serviceTypeId");
                if (serviceTypeId) {
                    const serviceType = serviceTypesData.data.find(
                        (st) => st.id === parseInt(serviceTypeId)
                    );
                    if (serviceType) {
                        setFormData((prev) => ({
                            ...prev,
                            type_id: serviceType.id,
                            assignee_id: serviceType.default_assignee_id,
                        }));
                    }
                }
            } catch (err) {
                setError(
                    err instanceof Error ? err.message : "Failed to load data"
                );
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [searchParams]);

    // Load bookings when apartment is selected
    useEffect(() => {
        const loadBookings = async () => {
            if (!formData.apartment_id) {
                setBookings([]);
                return;
            }

            try {
                const bookingsData = await bookingService.getBookings({
                    apartment_id: formData.apartment_id,
                    limit: 50,
                });
                setBookings(bookingsData.bookings || []);
            } catch (err) {
                console.error("Failed to load bookings:", err);
                setBookings([]);
            }
        };

        loadBookings();
    }, [formData.apartment_id]);

    // Set who_pays based on booking when bookingId is provided and bookings are loaded
    useEffect(() => {
        if (bookingId && bookings.length > 0) {
            const selectedBooking = bookings.find((b) => b.id === bookingId);
            if (selectedBooking) {
                setFormData((prev) => ({
                    ...prev,
                    who_pays:
                        selectedBooking.user_type === "owner"
                            ? "owner"
                            : "renter",
                    booking_id: bookingId, // Ensure the booking_id is set correctly
                }));
            }
        } else if (whoPays) {
            // If whoPays is passed directly (e.g., from the booking), use it
            setFormData(prev => ({
                ...prev,
                who_pays: whoPays
            }));
        }
    }, [bookingId, bookings, whoPays]);

    // Prefill form in edit mode
    useEffect(() => {
        const fetchAndPrefill = async () => {
            if (!id) return;
            try {
                setLoading(true);
                setError(null);
                const data = await serviceRequestService.getServiceRequestById(
                    Number(id)
                );
                setFormData({
                    type_id: data.type_id,
                    apartment_id: data.apartment_id,
                    booking_id: data.booking_id,
                    requester_id: data.requester_id,
                    date_action: data.date_action,
                    status: data.status,
                    who_pays: data.who_pays,
                    notes: data.notes,
                    assignee_id: data.assignee_id,
                });
            } catch (err) {
                setError("Failed to load service request for editing");
            } finally {
                setLoading(false);
            }
        };
        fetchAndPrefill();
    }, [id]);

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSelectChange = (
        event: SelectChangeEvent,
        fieldName: string
    ) => {
        const value = event.target.value;
        let parsedValue: any = value;

        // Parse numeric values
        if (
            [
                "type_id",
                "apartment_id",
                "booking_id",
                "assignee_id",
                "requester_id",
            ].includes(fieldName)
        ) {
            parsedValue = value ? parseInt(value) : undefined;
        }

        setFormData((prev) => ({
            ...prev,
            [fieldName]: parsedValue,
        }));

        // When apartment changes, reset booking selection
        if (fieldName === "apartment_id") {
            setFormData((prev) => ({
                ...prev,
                booking_id: undefined,
            }));
        }
    };

    const handleDateChange = (date: Date | null) => {
        setFormData((prev) => ({
            ...prev,
            date_action: date ? date.toISOString() : undefined,
        }));
    };

    const handleSubmit = async () => {
        try {
            setSubmitting(true);
            setError(null);

            // Validate required fields
            if (
                !formData.type_id ||
                !formData.apartment_id ||
                !formData.requester_id
            ) {
                setError(
                    "Please select service type, apartment, and requester"
                );
                return;
            }

            if (!currentUser) {
                setError("User not authenticated");
                return;
            }

            const requestData: CreateServiceRequestRequest = {
                ...formData,
                requester_id: formData.requester_id!,
                type_id: formData.type_id,
                apartment_id: formData.apartment_id,
            };

            if (id) {
                // Edit mode - update existing service request
                await serviceRequestService.updateServiceRequest(
                    Number(id),
                    requestData
                );
            } else {
                // Create mode - create new service request
                await serviceRequestService.createServiceRequest(requestData);
            }

            if (onSuccess) {
                onSuccess();
            } else {
                navigate("/services?tab=0"); // Navigate to service requests tab
            }
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to save service request"
            );
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = () => {
        if (onCancel) {
            onCancel();
        } else {
            navigate("/services");
        }
    };

    const getSelectedServiceType = () => {
        return serviceTypes.find((st) => st.id === formData.type_id);
    };

    const getSelectedApartment = () => {
        return apartments.find((apt) => apt.id === formData.apartment_id);
    };

    const getSelectedRequester = () => {
        return users.find((user) => user.id === formData.requester_id);
    };

    if (loading) {
        return (
            <Container maxWidth="md">
                <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                    <CircularProgress />
                </Box>
            </Container>
        );
    }

    if (error && serviceTypes.length === 0) {
        return (
            <Container maxWidth="md">
                <Alert severity="error" sx={{ mt: 4 }}>
                    {error}
                </Alert>
                <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={handleCancel}
                    sx={{ mt: 2 }}
                >
                    Back to Services
                </Button>
            </Container>
        );
    }

    const selectedServiceType = getSelectedServiceType();
    const selectedApartment = getSelectedApartment();
    const selectedRequester = getSelectedRequester();

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Container maxWidth="md">
                <Box sx={{ mb: 4, mt: 3 }}>
                    {/* Header */}
                    <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
                        <Button
                            variant="text"
                            color="primary"
                            startIcon={<ArrowBackIcon />}
                            onClick={handleCancel}
                        >
                            Back
                        </Button>
                        <Typography variant="h4" sx={{ ml: 2 }}>
                            Request Service
                        </Typography>
                    </Box>

                    {error && (
                        <Alert severity="error" sx={{ mb: 3 }}>
                            {error}
                        </Alert>
                    )}

                    {/* Service Type Selection */}
                    <Paper sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Service Details
                        </Typography>

                        <Grid container spacing={3}>
                            <Grid size={{ xs: 12 }}>
                                <FormControl fullWidth required>
                                    <InputLabel>Service Type</InputLabel>
                                    <Select
                                        value={
                                            formData.type_id?.toString() || ""
                                        }
                                        label="Service Type"
                                        onChange={(e) =>
                                            handleSelectChange(e, "type_id")
                                        }
                                    >
                                        <MenuItem value="">
                                            <em>Select a service type</em>
                                        </MenuItem>
                                        {serviceTypes.map((serviceType) => (
                                            <MenuItem
                                                key={serviceType.id}
                                                value={serviceType.id.toString()}
                                            >
                                                <Box
                                                    sx={{
                                                        display: "flex",
                                                        justifyContent:
                                                            "space-between",
                                                        alignItems: "center",
                                                        width: "100%",
                                                    }}
                                                >
                                                    <span>
                                                        {serviceType.name}
                                                    </span>
                                                    <Chip
                                                        label={`${serviceType.cost} ${serviceType.currency}`}
                                                        size="small"
                                                        color="primary"
                                                        variant="outlined"
                                                    />
                                                </Box>
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                        </Grid>
                    </Paper>

                    {/* Location and Booking */}
                    <Paper sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Location & Booking
                        </Typography>

                        <Grid container spacing={3}>
                            <Grid size={{ xs: 12 }}>
                                <SearchableDropdown
                                    options={apartments.map((apartment) => ({
                                        id: apartment.id,
                                        label: `${apartment.name} - ${apartment.village?.name}`,
                                        name: apartment.name,
                                        village: apartment.village,
                                    }))}
                                    value={formData.apartment_id || null}
                                    onChange={(value) =>
                                        handleSelectChange(
                                            {
                                                target: {
                                                    value:
                                                        value?.toString() || "",
                                                },
                                            } as SelectChangeEvent,
                                            "apartment_id"
                                        )
                                    }
                                    label="Apartment"
                                    placeholder="Search apartments by name..."
                                    required
                                    disabled={
                                        lockApartment &&
                                        apartmentId !== undefined
                                    }
                                    getOptionLabel={(option) => option.label}
                                    renderOption={(props, option) => (
                                        <li {...props}>
                                            <Box>
                                                <Typography variant="body1">
                                                    {option.name}
                                                </Typography>
                                                <Typography
                                                    variant="body2"
                                                    color="text.secondary"
                                                >
                                                    {option.village?.name}
                                                </Typography>
                                            </Box>
                                        </li>
                                    )}
                                />
                            </Grid>

                            {formData.apartment_id && bookings.length > 0 && (
                                <Grid size={{ xs: 12 }}>
                                    <FormControl fullWidth>
                                        <InputLabel>
                                            Related Booking (Optional)
                                        </InputLabel>
                                        <Select
                                            value={
                                                formData.booking_id?.toString() ||
                                                ""
                                            }
                                            label="Related Booking (Optional)"
                                            onChange={(e) =>
                                                handleSelectChange(
                                                    e,
                                                    "booking_id"
                                                )
                                            }
                                        >
                                            <MenuItem value="">
                                                <em>No related booking</em>
                                            </MenuItem>
                                            {(bookings || []).map((booking) => (
                                                <MenuItem
                                                    key={booking.id}
                                                    value={booking.id.toString()}
                                                >
                                                    {booking.user?.name} -{" "}
                                                    {new Date(
                                                        booking.arrival_date
                                                    ).toLocaleDateString()}{" "}
                                                    to{" "}
                                                    {new Date(
                                                        booking.leaving_date
                                                    ).toLocaleDateString()}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                            )}

                            {selectedApartment && (
                                <Grid size={{ xs: 12 }}>
                                    <Card variant="outlined">
                                        <CardContent>
                                            <Typography
                                                variant="subtitle1"
                                                gutterBottom
                                            >
                                                {selectedApartment.name}
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                            >
                                                Village:{" "}
                                                {
                                                    selectedApartment.village
                                                        ?.name
                                                }
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                            >
                                                Owner:{" "}
                                                {selectedApartment.owner?.name}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            )}
                        </Grid>
                    </Paper>

                    {/* Service Request Details */}
                    <Paper sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Request Details
                        </Typography>

                        <Grid container spacing={3}>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <DateTimePicker
                                    label="Service Date (When should the service be done?)"
                                    value={
                                        formData.date_action
                                            ? new Date(formData.date_action)
                                            : null
                                    }
                                    onChange={handleDateChange}
                                    slotProps={{
                                        textField: {
                                            fullWidth: true,
                                        },
                                    }}
                                />
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6 }}>
                                <FormControl fullWidth required>
                                    <InputLabel>Who Pays</InputLabel>
                                    <Select
                                        value={formData.who_pays}
                                        label="Who Pays"
                                        onChange={(e) =>
                                            handleSelectChange(e, "who_pays")
                                        }
                                    >
                                        <MenuItem value="owner">Owner</MenuItem>
                                        <MenuItem value="renter">
                                            Tenant
                                        </MenuItem>
                                        <MenuItem value="company">
                                            Company
                                        </MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6 }}>
                                <SearchableDropdown
                                    options={users.map((user) => ({
                                        id: user.id,
                                        label: `${user.name} (${user.role})`,
                                        name: user.name,
                                        role: user.role,
                                    }))}
                                    value={formData.requester_id || null}
                                    onChange={(value) =>
                                        handleSelectChange(
                                            {
                                                target: {
                                                    value:
                                                        value?.toString() || "",
                                                },
                                            } as SelectChangeEvent,
                                            "requester_id"
                                        )
                                    }
                                    label="Requester"
                                    placeholder="Search users by name..."
                                    required
                                    getOptionLabel={(option) => option.label}
                                    renderOption={(props, option) => (
                                        <li {...props}>
                                            <Box>
                                                <Typography variant="body1">
                                                    {option.name}
                                                </Typography>
                                                <Typography
                                                    variant="body2"
                                                    color="text.secondary"
                                                >
                                                    {option.role}
                                                </Typography>
                                            </Box>
                                        </li>
                                    )}
                                />
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6 }}>
                                <FormControl fullWidth>
                                    <InputLabel>Status</InputLabel>
                                    <Select
                                        value={formData.status}
                                        label="Status"
                                        onChange={(e) =>
                                            handleSelectChange(e, "status")
                                        }
                                    >
                                        <MenuItem value="Created">
                                            Created
                                        </MenuItem>
                                        <MenuItem value="In Progress">
                                            In Progress
                                        </MenuItem>
                                        <MenuItem value="Done">Done</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid size={{ xs: 12 }}>
                                <TextField
                                    label="Notes (Optional)"
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleInputChange}
                                    fullWidth
                                    multiline
                                    rows={4}
                                    placeholder="Add any additional notes or special instructions..."
                                />
                            </Grid>
                        </Grid>
                    </Paper>

                    {/* Summary */}
                    {formData.type_id &&
                        formData.apartment_id &&
                        formData.requester_id && (
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        Request Summary
                                    </Typography>
                                    <Box
                                        sx={{
                                            display: "grid",
                                            gridTemplateColumns: {
                                                xs: "1fr",
                                                sm: "repeat(2, 1fr)",
                                            },
                                            gap: 2,
                                        }}
                                    >
                                        <Box>
                                            <Typography
                                                variant="subtitle2"
                                                color="text.secondary"
                                            >
                                                Service
                                            </Typography>
                                            <Typography variant="body1">
                                                {selectedServiceType?.name}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography
                                                variant="subtitle2"
                                                color="text.secondary"
                                            >
                                                Cost
                                            </Typography>
                                            <Typography variant="body1">
                                                {selectedServiceType?.cost}{" "}
                                                {selectedServiceType?.currency}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography
                                                variant="subtitle2"
                                                color="text.secondary"
                                            >
                                                Apartment
                                            </Typography>
                                            <Typography variant="body1">
                                                {selectedApartment?.name}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography
                                                variant="subtitle2"
                                                color="text.secondary"
                                            >
                                                Who Pays
                                            </Typography>
                                            <Typography variant="body1">
                                                {formData.who_pays
                                                    .charAt(0)
                                                    .toUpperCase() +
                                                    formData.who_pays.slice(1)}
                                            </Typography>
                                        </Box>
                                        {formData.requester_id && (
                                            <Box>
                                                <Typography
                                                    variant="subtitle2"
                                                    color="text.secondary"
                                                >
                                                    Requester
                                                </Typography>
                                                <Typography variant="body1">
                                                    {selectedRequester?.name} (
                                                    {selectedRequester?.role})
                                                </Typography>
                                            </Box>
                                        )}
                                        {formData.date_action && (
                                            <Box>
                                                <Typography
                                                    variant="subtitle2"
                                                    color="text.secondary"
                                                >
                                                    Service Date
                                                </Typography>
                                                <Typography variant="body1">
                                                    {new Date(
                                                        formData.date_action
                                                    ).toLocaleString()}
                                                </Typography>
                                            </Box>
                                        )}
                                    </Box>
                                </CardContent>
                            </Card>
                        )}

                    {/* Action Buttons */}
                    <Box
                        sx={{
                            mt: 4,
                            display: "flex",
                            gap: 2,
                            justifyContent: "flex-end",
                        }}
                    >
                        <Button
                            variant="outlined"
                            startIcon={<CancelIcon />}
                            onClick={handleCancel}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<SaveIcon />}
                            onClick={handleSubmit}
                            disabled={
                                submitting ||
                                !formData.type_id ||
                                !formData.apartment_id ||
                                !formData.requester_id
                            }
                        >
                            {submitting
                                ? id
                                    ? "Saving..."
                                    : "Creating..."
                                : id
                                ? "Edit Request"
                                : "Create Request"}
                        </Button>
                    </Box>
                </Box>
            </Container>
        </LocalizationProvider>
    );
}
