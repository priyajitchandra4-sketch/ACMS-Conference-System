from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db.models.user import User, RoleAssignment # Or app.db.base / wherever your models are imported from
from app.core.security import get_password_hash

def seed_database():
    db: Session = SessionLocal()
    try:
        demo_users = [
            {
                "email": "chair@university.edu",
                "full_name": "Prof. Conference Chair",
                "affiliation": "ACMS University",
                "roles": ["chair"]
            },
            {
                "email": "trackchair@university.edu",
                "full_name": "Dr. Track Chair",
                "affiliation": "Institute of Tech",
                "roles": ["track_chair"]
            },
            {
                "email": "reviewer@university.edu",
                "full_name": "Dr. Peer Reviewer",
                "affiliation": "Science Academy",
                "roles": ["reviewer"]
            },
            {
                "email": "author@university.edu",
                "full_name": "Ananya Sen (Author)",
                "affiliation": "Research Labs",
                "roles": ["author"]
            },
            {
                "email": "delegate@university.edu",
                "full_name": "Rahul Das (Delegate)",
                "affiliation": "Tech Corp",
                "roles": ["delegate"]
            },
            {
                "email": "multirole@university.edu",
                "full_name": "Dr. Multi Role User",
                "affiliation": "University of Engineering",
                "roles": ["author", "delegate"] # Great for testing the header role switcher!
            }
        ]

        print("Starting database seeding for all roles...")
        for user_data in demo_users:
            existing_user = db.query(User).filter(User.email == user_data["email"]).first()
            
            if not existing_user:
                print(f"Creating user: {user_data['email']} with roles {user_data['roles']}")
                new_user = User(
                    email=user_data["email"],
                    password_hash=get_password_hash("password123"), # Corrected keyword argument
                    full_name=user_data["full_name"],
                    affiliation=user_data["affiliation"],
                    is_active=True
                )
                db.add(new_user)
                db.commit()
                db.refresh(new_user)

                # Assign all roles specified for this user
                for role_name in user_data["roles"]:
                    role_assignment = RoleAssignment(
                        user_id=new_user.id,
                        role=role_name,
                        conference_id=None,
                        track_id=None
                    )
                    db.add(role_assignment)
                db.commit()
            else:
                print(f"User {user_data['email']} already exists. Skipping.")

        print("\nSeeding complete! All demo accounts use password: password123")
        
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()