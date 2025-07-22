# EduLearn Backend API Documentation

## Authentication
- All endpoints that require authentication expect a JWT token in the `Authorization: Bearer <token>` header.

---

## Courses

| Method | Endpoint                        | Description                                 | Auth/Role           |
|--------|----------------------------------|---------------------------------------------|---------------------|
| GET    | `/api/courses`                  | List all courses (with filters, pagination) | Public              |
| GET    | `/api/courses/:id`              | Get course details by ID                    | Public              |
| POST   | `/api/courses`                  | Create a new course                        | Auth (instructor/admin) |
| PUT    | `/api/courses/:id`              | Update a course                            | Auth (instructor/admin, owner) |
| DELETE | `/api/courses/:id`              | Delete a course                            | Auth (instructor/admin, owner) |
| GET    | `/api/courses/instructor`        | Get courses for logged-in instructor        | Auth (instructor/admin) |

---

## Users

| Method | Endpoint                        | Description                                 | Auth/Role           |
|--------|----------------------------------|---------------------------------------------|---------------------|
| POST   | `/api/users/register`            | Register a new user                         | Public              |
| POST   | `/api/users/login`               | Login and get JWT token                     | Public              |
| GET    | `/api/users/profile`             | Get current user profile                    | Auth                |
| PUT    | `/api/users/profile`             | Update current user profile                 | Auth                |

---

## Enrollments

| Method | Endpoint                        | Description                                 | Auth/Role           |
|--------|----------------------------------|---------------------------------------------|---------------------|
| POST   | `/api/enrollments`               | Enroll in a course                          | Auth (student)      |
| GET    | `/api/enrollments/user`          | Get all enrollments for current user        | Auth (student)      |
| GET    | `/api/enrollments/course/:id`    | Get enrollment status for a course          | Auth (student)      |
| PUT    | `/api/enrollments/course/:id/progress` | Update course progress                | Auth (student)      |
| PUT    | `/api/enrollments/course/:id/lesson`   | Mark lesson complete                   | Auth (student)      |

---

## Ratings

| Method | Endpoint                        | Description                                 | Auth/Role           |
|--------|----------------------------------|---------------------------------------------|---------------------|
| POST   | `/api/ratings/course/:courseId`  | Add or update rating for a course           | Auth (student, enrolled) |
| GET    | `/api/ratings/course/:courseId`  | Get all ratings for a course                | Public              |
| GET    | `/api/ratings/course/:courseId/user` | Get current user's rating for a course  | Auth (student)      |
| DELETE | `/api/ratings/course/:courseId`  | Delete current user's rating for a course   | Auth (student)      |

---

## Resources

| Method | Endpoint                        | Description                                 | Auth/Role           |
|--------|----------------------------------|---------------------------------------------|---------------------|
| GET    | `/api/resources/course/:courseId`| Get resources for a course                  | Public              |
| POST   | `/api/resources`                 | Add a resource to a course                  | Auth (instructor/admin) |
| PUT    | `/api/resources/:id`             | Update a resource                           | Auth (instructor/admin) |
| DELETE | `/api/resources/:id`             | Delete a resource                           | Auth (instructor/admin) |

---

## Certificates

| Method | Endpoint                        | Description                                 | Auth/Role           |
|--------|----------------------------------|---------------------------------------------|---------------------|
| POST   | `/api/certificates/course/:id`   | Generate certificate for a course           | Auth (student, completed) |
| GET    | `/api/certificates/course/:id`   | Get certificate for a course                | Auth (student)      |
| GET    | `/api/certificates/user`         | Get all certificates for current user       | Auth (student)      |

---

## Analytics

| Method | Endpoint                        | Description                                 | Auth/Role           |
|--------|----------------------------------|---------------------------------------------|---------------------|
| GET    | `/api/analytics/instructor`      | Get analytics for instructor                | Auth (instructor)   |
| GET    | `/api/analytics/course/:id`      | Get analytics for a specific course         | Auth (instructor)   |
| GET    | `/api/analytics/admin`           | Get platform analytics (admin)              | Auth (admin)        |

---

## Admin

| Method | Endpoint                        | Description                                 | Auth/Role           |
|--------|----------------------------------|---------------------------------------------|---------------------|
| GET    | `/api/admin/users`               | Get all users                               | Auth (admin)        |
| GET    | `/api/admin/courses`             | Get all courses                             | Auth (admin)        |
| GET    | `/api/admin/stats`               | Get platform stats                          | Auth (admin)        |
| PUT    | `/api/admin/users/:userId/status`| Activate/deactivate a user                  | Auth (admin)        |
| PUT    | `/api/admin/users/:userId/role`  | Update user role                            | Auth (admin)        |
| DELETE | `/api/admin/users/:userId`       | Delete a user                               | Auth (admin)        |

---

## Error Responses
- All endpoints return `{ success: false, message: "..." }` on error.
- 401 Unauthorized if not logged in or token is invalid.
- 403 Forbidden if lacking required role.
- 404 Not Found if resource does not exist.

---

## Notes
- All POST/PUT endpoints expect JSON bodies.
- Pagination and filtering are available on many list endpoints via query params.
- For more details, see the code in `/backend/controllers/` and `/backend/routes/`.
